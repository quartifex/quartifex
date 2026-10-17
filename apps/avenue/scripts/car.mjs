// Builds the AVENUE concept car into two GLBs (desktop and a lighter mobile LOD) from
// src/three/shape.ts, then runs each through freight (names, dedupe, weld, Meshopt) and checks
// it against the app's budgets in budget.json. Output goes to public/models (git-ignored);
// freight's reports go to reports/avenue/freight-<lod>/.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Document } from "@gltf-transform/core";
import { KHRMaterialsClearcoat, KHRMaterialsEmissiveStrength } from "@gltf-transform/extensions";
import { createIO, freightFile } from "@quartifex/freight/node";
import { buildCar } from "../src/three/shape.ts";

const app = path.join(import.meta.dirname, "..");
const root = path.join(app, "..", "..");

/** PBR values per material name. Colours are linear RGB. */
const MATERIALS = {
  // A deep blue-black with a metallic base and a clear coat: reads as paint at night.
  paint: {
    color: [0.012, 0.016, 0.024, 1],
    metal: 0.7,
    rough: 0.36,
    clearcoat: true,
    double: true,
  },
  glass: { color: [0.002, 0.003, 0.004, 0.74], metal: 0, rough: 0.03, blend: true, double: true },
  underbody: { color: [0.004, 0.004, 0.004, 1], metal: 0, rough: 0.9 },
  tyre: { color: [0.008, 0.008, 0.009, 1], metal: 0, rough: 0.82 },
  rim: { color: [0.32, 0.33, 0.35, 1], metal: 1, rough: 0.28 },
  leather: { color: [0.36, 0.27, 0.19, 1], metal: 0, rough: 0.62 },
  cabin: { color: [0.02, 0.021, 0.024, 1], metal: 0.1, rough: 0.5 },
  trim: { color: [0.02, 0.02, 0.02, 1], metal: 0.2, rough: 0.4 },
  lightFront: {
    color: [0, 0, 0, 1],
    metal: 0,
    rough: 0.4,
    double: true,
    emissive: [1, 0.96, 0.9],
    strength: 6,
  },
  lightRear: {
    color: [0, 0, 0, 1],
    metal: 0,
    rough: 0.4,
    double: true,
    emissive: [1, 0.05, 0.03],
    strength: 5,
  },
  screen: { color: [0, 0, 0, 1], metal: 0, rough: 0.2, emissive: [0.05, 0.05, 0.06], strength: 1 },
};

function toDocument(detail) {
  const doc = new Document();
  doc.getRoot().getAsset().generator = "avenue/scripts/car.mjs";
  const buffer = doc.createBuffer("car");
  const clearcoat = doc.createExtension(KHRMaterialsClearcoat);
  const emissive = doc.createExtension(KHRMaterialsEmissiveStrength);
  const materials = new Map();
  const material = (name) => {
    if (materials.has(name)) return materials.get(name);
    const spec = MATERIALS[name];
    const m = doc
      .createMaterial(name)
      .setBaseColorFactor(spec.color)
      .setMetallicFactor(spec.metal)
      .setRoughnessFactor(spec.rough)
      .setDoubleSided(Boolean(spec.double));
    if (spec.blend) m.setAlphaMode("BLEND");
    if (spec.clearcoat) {
      m.setExtension(
        "KHR_materials_clearcoat",
        clearcoat.createClearcoat().setClearcoatFactor(1).setClearcoatRoughnessFactor(0.04),
      );
    }
    if (spec.emissive) {
      m.setEmissiveFactor(spec.emissive);
      m.setExtension(
        "KHR_materials_emissive_strength",
        emissive.createEmissiveStrength().setEmissiveStrength(spec.strength),
      );
    }
    materials.set(name, m);
    return m;
  };
  const meshes = new Map();
  const toMesh = (data) => {
    if (meshes.has(data.name)) return meshes.get(data.name);
    const prim = doc
      .createPrimitive()
      .setAttribute(
        "POSITION",
        doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(data.positions))
          .setBuffer(buffer),
      )
      .setAttribute(
        "NORMAL",
        doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(data.normals))
          .setBuffer(buffer),
      )
      .setAttribute(
        "TEXCOORD_0",
        doc.createAccessor().setType("VEC2").setArray(new Float32Array(data.uvs)).setBuffer(buffer),
      )
      .setIndices(
        doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array(data.indices))
          .setBuffer(buffer),
      )
      .setMaterial(material(data.material));
    const mesh = doc.createMesh(data.name).addPrimitive(prim);
    meshes.set(data.name, mesh);
    return mesh;
  };
  const toNode = (part) => {
    const node = doc.createNode(part.name);
    if (part.at) node.setTranslation(part.at);
    if (part.meshes.length === 1) node.setMesh(toMesh(part.meshes[0]));
    else for (const m of part.meshes) node.addChild(doc.createNode(m.name).setMesh(toMesh(m)));
    for (const child of part.children ?? []) node.addChild(toNode(child));
    return node;
  };
  doc.createScene("avenue").addChild(toNode(buildCar(detail)));
  return doc;
}

/** Build both LODs. Returns freight's results, and whether every budget passed. */
export async function buildCarModels({ out = path.join(app, "public", "models") } = {}) {
  const budgets = JSON.parse(await readFile(path.join(root, "budget.json"), "utf8")).apps.find(
    (a) => a.app === "avenue",
  );
  const { io } = await createIO();
  const tmp = path.join(os.tmpdir(), `avenue-car-${process.pid}`);
  await mkdir(tmp, { recursive: true });
  await mkdir(out, { recursive: true });
  const results = [];
  try {
    for (const [lod, detail, file, budget] of [
      ["desktop", "high", "avenue-car.glb", budgets?.freight],
      ["mobile", "low", "avenue-car-lite.glb", budgets?.freightLite],
    ]) {
      const raw = path.join(tmp, file);
      await writeFile(raw, await io.writeBinary(toDocument(detail)));
      const result = await freightFile(raw, path.join(out, file), {
        compress: "meshopt",
        textures: { format: "keep" },
        ...(budget ? { budget } : {}),
        report: path.join(root, "reports", "avenue", `freight-${lod}`),
      });
      results.push({ lod, file, result });
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  return {
    results,
    pass: results.every((r) => r.result.verdict?.pass !== false),
  };
}
