import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { KHRMaterialsClearcoat } from "@gltf-transform/extensions";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkNames,
  cleanName,
  freight,
  inspect,
  r3fModule,
  report,
  threeName,
  verdict,
} from "./index.js";
import { createIO, freightFile, readBudget } from "./node.js";

/** A triangle soup (no indices, every vertex repeated) for a cylinder's side. */
function cylinder(radius: number, height: number, segments: number): Float32Array {
  const out: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const b = ((i + 1) / segments) * Math.PI * 2;
    const p = (t: number, y: number) => [Math.sin(t) * radius, y, Math.cos(t) * radius];
    out.push(...p(a, 0), ...p(b, 0), ...p(a, height), ...p(b, 0), ...p(b, height), ...p(a, height));
  }
  return new Float32Array(out);
}

/** A jar with the usual export faults: default names, duplicate materials, an unused one, an unwelded mesh, a 2048 px PNG. */
async function jar(): Promise<Document> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene("jar");
  // A patterned label: a solid colour would be pruned to a material factor.
  const pixels = new Uint8Array(2048 * 1024 * 3).map((_, i) => {
    const x = Math.floor(i / 3) % 2048;
    const y = Math.floor(i / 3 / 2048);
    return ((x >> 6) + (y >> 6)) % 2 ? 230 : 40 + (i % 3) * 60;
  });
  const label = await sharp(pixels, { raw: { width: 2048, height: 1024, channels: 3 } })
    .png()
    .toBuffer();
  const texture = doc
    .createTexture("label")
    .setImage(new Uint8Array(label))
    .setMimeType("image/png")
    .setURI("label.png");
  const dark = (name: string) =>
    doc.createMaterial(name).setBaseColorFactor([0.05, 0.05, 0.05, 1]).setRoughnessFactor(0.6);
  const mats = [dark("Material.001"), dark("Material.002"), dark("lid-metal")];
  doc.createMaterial("unused");
  const print = doc.createMaterial("label print").setBaseColorTexture(texture);
  const mesh = (name: string, radius: number, height: number, material = mats[0]) => {
    const position = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(cylinder(radius, height, 48))
      .setBuffer(buffer);
    const prim = doc.createPrimitive().setAttribute("POSITION", position);
    if (material) prim.setMaterial(material);
    return doc.createMesh(name).addPrimitive(prim);
  };
  const body = doc.createNode("body").setMesh(mesh("Cylinder", 0.6, 1.2, mats[1]));
  const band = doc
    .createNode("band")
    .setMesh(mesh("band", 0.61, 0.4, print))
    .setTranslation([0, 0.4, 0]);
  const lid = doc
    .createNode("Cylinder.001")
    .setMesh(mesh("lid", 0.5, 0.2, mats[2]))
    .setTranslation([0, 1.25, 0]);
  const bolt = mesh("bolt", 0.02, 0.05);
  const boltA = doc.createNode("bolt").setMesh(bolt).setTranslation([0.3, 1.4, 0]);
  const boltB = doc.createNode("bolt").setMesh(bolt).setTranslation([-0.3, 1.4, 0]);
  scene.addChild(
    doc.createNode("").addChild(body).addChild(band).addChild(lid).addChild(boltA).addChild(boltB),
  );
  return doc;
}

let dir = "";
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "freight-test-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("inspect and verdict", () => {
  it("counts triangles for every node that draws a mesh, and measures textures", async () => {
    const stats = inspect(await jar());
    // 5 nodes draw 48-segment sides of 96 triangles each (the bolt twice).
    expect(stats.triangles).toBe(5 * 96);
    expect(stats.drawCalls).toBe(5);
    expect(stats.meshes).toBe(4);
    expect(stats.materials).toBe(5);
    expect(stats.maxTextureSize).toBe(2048);
    expect(stats.textures[0]).toMatchObject({
      name: "label",
      mimeType: "image/png",
      width: 2048,
      height: 1024,
    });
  });

  it("passes or fails each metric the budget sets", async () => {
    const stats = inspect(await jar(), 300_000);
    const v = verdict(stats, { bytes: 200_000, triangles: 1000, maxTextureSize: 4096 });
    expect(v.pass).toBe(false);
    expect(v.checks.map((c) => [c.metric, c.pass])).toEqual([
      ["bytes", false],
      ["triangles", true],
      ["maxTextureSize", true],
    ]);
  });
});

describe("names", () => {
  it("flags empty, exporter-default, invalid and duplicate names", async () => {
    const issues = checkNames(await jar());
    const problems = issues.map((i) => `${i.kind}:${i.name}:${i.problem}`);
    expect(problems).toContain("node:Cylinder.001:default");
    expect(problems).toContain("node::empty");
    expect(problems).toContain("node:bolt:duplicate");
    expect(problems).toContain("mesh:Cylinder:default");
    expect(problems).toContain("material:Material.001:default");
    expect(problems).toContain("material:label print:pattern");
  });

  it("renames offenders to unique, clean names with `fix`", async () => {
    const doc = await jar();
    const issues = checkNames(doc, { fix: true });
    expect(issues.find((i) => i.name === "label print")?.fixed).toBe("label-print");
    expect(issues.find((i) => i.name === "bolt")?.fixed).toBe("bolt-2");
    // Nodes take their mesh's name, meshes their node's.
    expect(issues.find((i) => i.name === "Cylinder.001")?.fixed).toBe("lid");
    expect(issues.find((i) => i.kind === "mesh" && i.name === "Cylinder")?.fixed).toBe("body");
    expect(checkNames(doc)).toEqual([]);
    expect(cleanName("Cube.003", "node-4")).toBe("node-4");
    expect(cleanName("2 Lid  rim", "x")).toBe("Lid-rim");
  });
});

describe("the preset", () => {
  it("dedupes, prunes and welds, and says what it did", async () => {
    const doc = await jar();
    const result = await freight(doc, { compress: "none" });
    // The three identical dark materials merge; the unused one goes.
    expect(result.after.materials).toBe(2);
    // Welding shares the vertices the soup repeated.
    expect(result.after.vertices).toBeLessThan(result.before.vertices / 2);
    expect(result.after.triangles).toBe(result.before.triangles);
    expect(result.steps.join("\n")).toMatch(/dedupe[\s\S]*prune[\s\S]*weld/);
    // No encoder: a 2048 px texture under the default cap is left alone, silently.
    expect(result.warnings).toEqual([]);
  });

  it("joins meshes that share a material when asked, cutting draw calls", async () => {
    const result = await freight(await jar(), { compress: "none", join: true });
    // Dark parts (body, lid, two bolts) become one draw; the label band is the other.
    expect(result.after.drawCalls).toBe(2);
    expect(result.after.triangles).toBe(result.before.triangles);
    expect(result.steps.at(-1)).toMatch(/^join:/);
  });

  it("warns when it cannot do what was asked", async () => {
    const result = await freight(await jar(), { textures: { maxSize: 512 } });
    expect(result.warnings.join(" ")).toMatch(/no texture encoder/);
    expect(result.warnings.join(" ")).toMatch(/Meshopt was asked for but no encoder/);
  });
});

describe("node runner", () => {
  it("writes a smaller GLB with Meshopt and WebP, a report, a verdict and typed R3F output", async () => {
    const input = path.join(dir, "jar.glb");
    await writeFile(input, await new NodeIO().writeBinary(await jar()));
    const output = path.join(dir, "out", "jar.glb");
    const { result, verdict: v } = await freightFile(input, output, {
      textures: { format: "webp", maxSize: 1024 },
      names: { fix: true },
      budget: { bytes: 60_000, triangles: 1000, drawCalls: 5, maxTextureSize: 1024 },
      report: path.join(dir, "report"),
      types: { file: path.join(dir, "Jar.tsx"), url: "/models/jar.glb", component: "jar" },
    });
    expect(result.after.bytes).toBeLessThan(result.before.bytes ?? 0);
    expect(result.after.maxTextureSize).toBe(1024);
    expect(result.after.textures[0]?.mimeType).toBe("image/webp");
    expect(result.after.extensions).toEqual(
      expect.arrayContaining(["EXT_meshopt_compression", "EXT_texture_webp"]),
    );
    expect(v?.checks.filter((c) => !c.pass)).toEqual([]);

    const markdown = await readFile(path.join(dir, "report", "freight.md"), "utf8");
    expect(markdown).toContain("**Verdict: PASS**");
    expect(markdown).toContain('renamed "label-print"');
    const json = JSON.parse(await readFile(path.join(dir, "report", "freight.json"), "utf8"));
    expect(json.file).toBe("jar.glb");

    const tsx = await readFile(path.join(dir, "Jar.tsx"), "utf8");
    expect(tsx).toContain('export const JAR_URL = "/models/jar.glb";');
    expect(tsx).toContain('"body": Mesh;');
    expect(tsx).toContain("export function Jar(props");

    // The output reads back with the same codecs.
    const { io } = await createIO();
    const back = await io.read(output);
    expect(inspect(back).triangles).toBe(result.before.triangles);
  });

  it("compresses with Draco, and falls back to WebP when toktx is missing", async () => {
    const input = path.join(dir, "jar2.glb");
    await writeFile(input, await new NodeIO().writeBinary(await jar()));
    const previous = process.env.FREIGHT_TOKTX;
    process.env.FREIGHT_TOKTX = path.join(dir, "no-such-toktx");
    try {
      const { result } = await freightFile(input, path.join(dir, "jar2-out.glb"), {
        compress: "draco",
        textures: { format: "ktx2", maxSize: 512 },
      });
      expect(result.after.extensions).toContain("KHR_draco_mesh_compression");
      expect(result.warnings[0]).toMatch(/toktx .* not found: textures are WebP/);
      expect(result.after.textures[0]?.mimeType).toBe("image/webp");
    } finally {
      if (previous === undefined) delete process.env.FREIGHT_TOKTX;
      else process.env.FREIGHT_TOKTX = previous;
    }
  });

  it("reads one app's freight budget", async () => {
    const file = path.join(dir, "budget.json");
    await writeFile(file, JSON.stringify({ apps: [{ app: "lab", freight: { bytes: 1 } }] }));
    expect(await readBudget(file, "lab")).toEqual({ bytes: 1 });
    await expect(readBudget(file, "nope")).rejects.toThrow(/no "freight" block/);
  });
});

describe("typed R3F module", () => {
  it("types physical materials, keeps transforms and loads multi-primitive meshes as they are", () => {
    const doc = new Document();
    const scene = doc.createScene();
    const clearcoat = doc.createExtension(KHRMaterialsClearcoat);
    const glass = doc
      .createMaterial("glass")
      .setExtension("KHR_materials_clearcoat", clearcoat.createClearcoat());
    const steel = doc.createMaterial("steel");
    const one = doc.createMesh("cap").addPrimitive(doc.createPrimitive().setMaterial(glass));
    const two = doc
      .createMesh("body")
      .addPrimitive(doc.createPrimitive().setMaterial(steel))
      .addPrimitive(doc.createPrimitive().setMaterial(glass));
    scene.addChild(doc.createNode("cap top").setMesh(one).setTranslation([0, 1, 0]));
    scene.addChild(doc.createNode("body").setMesh(two));
    const tsx = r3fModule(doc, { url: "/bottle.glb", component: "bottle" });
    expect(tsx).toContain('"glass": MeshPhysicalMaterial;');
    expect(tsx).toContain('"steel": MeshStandardMaterial;');
    expect(tsx).toContain(
      '<mesh name="cap_top" geometry={nodes["cap_top"].geometry} material={materials["glass"]} position={[0, 1, 0]} />',
    );
    expect(tsx).toContain('<primitive object={nodes["body"]} />');
    expect(tsx).toContain("export function Bottle(");
    expect(threeName("a.b [c]/d:e f")).toBe("ab_cde_f");
  });

  it("reports in Markdown", async () => {
    const result = await freight(await jar(), { compress: "none" });
    const md = report(result, verdict(result.after, { triangles: 10 }), "jar.glb");
    expect(md).toContain("# freight: jar.glb");
    expect(md).toContain("**Verdict: FAIL**");
    expect(md).toContain("| triangles | 480 | 10 | FAIL |");
  });
});
