// @quartifex/freight (L09, Pipeline). An opinionated glTF-Transform preset with a verdict:
// dedupe, prune, weld, texture caps and re-encoding, Meshopt or Draco, naming rules, a
// budget pass or fail and a typed React Three Fiber module. It is a preset and a report on
// top of glTF-Transform, not a new engine. This entry is browser-safe; the Node runner (sharp,
// KTX2 through toktx, the CLI) is ./node, the in-browser runner is ./browser.
import {
  type Document,
  ImageUtils,
  type Material,
  type Mesh,
  type Node,
  Primitive,
  PropertyType,
  type Texture,
} from "@gltf-transform/core";
import {
  EXTMeshoptCompression,
  EXTTextureAVIF,
  EXTTextureWebP,
  KHRDracoMeshCompression,
  KHRTextureBasisu,
} from "@gltf-transform/extensions";
import { dedup, draco, flatten, join, meshopt, prune, weld } from "@gltf-transform/functions";

export type TextureFormat = "webp" | "avif" | "ktx2" | "png" | "jpeg";

/** What a texture encoder receives and returns. */
export type EncodedImage = { image: Uint8Array; mimeType: string; width: number; height: number };

export type TextureEncoder = (
  input: EncodedImage,
  target: {
    format: TextureFormat;
    maxSize: number;
    quality: number;
    /** "color" (base colour, emissive), "data" (normals, roughness, occlusion: keep them linear and crisp). */
    role: "color" | "data";
  },
) => Promise<EncodedImage | null>;

export type FreightOptions = {
  /** "meshopt" (default): smaller, decodes fast; "draco": smallest geometry, heavier decoder; "none". */
  compress?: "meshopt" | "draco" | "none";
  textures?: {
    /** Re-encode to this format. "keep" (default for the core) leaves formats alone and only caps size. */
    format?: TextureFormat | "keep";
    /** Longest edge in pixels. Default 2048. */
    maxSize?: number;
    /** 0 to 100. Default 82. */
    quality?: number;
  };
  /** Merge identical accessors, meshes, materials and textures. Default true. */
  dedupe?: boolean;
  /** Remove anything the scene does not use. Default true. */
  prune?: boolean;
  /** Merge identical vertices and index every primitive. Default true. */
  weld?: boolean;
  /**
   * Flatten the hierarchy and merge meshes that share a material: fewer draw calls, but the
   * parts are no longer separate (no exploded views, no per-part picking). Default false.
   */
  join?: boolean;
  /** Naming rules; `fix: true` renames offenders instead of only reporting them. */
  names?: NameRules & { fix?: boolean };
  /** Provided by ./node or ./browser. Without one, textures are only measured. */
  encodeTexture?: TextureEncoder;
  /** The Meshopt encoder (`MeshoptEncoder` from meshoptimizer), needed for "meshopt". */
  meshoptEncoder?: unknown;
};

export type TextureStats = {
  name: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
};

export type Stats = {
  /** Size of the written GLB, when known. */
  bytes?: number;
  /** Triangles drawn, counting every node that uses a mesh. */
  triangles: number;
  vertices: number;
  meshes: number;
  /** Primitives drawn: roughly one draw call each. */
  drawCalls: number;
  materials: number;
  nodes: number;
  animations: number;
  textures: TextureStats[];
  textureBytes: number;
  /** Longest texture edge. */
  maxTextureSize: number;
  extensions: string[];
};

export type Budget = {
  bytes?: number;
  triangles?: number;
  drawCalls?: number;
  materials?: number;
  textureBytes?: number;
  maxTextureSize?: number;
};

export type Check = { metric: keyof Budget; value: number; limit: number; pass: boolean };
export type Verdict = { pass: boolean; checks: Check[] };

export type NameRules = {
  /** Every name must match. Default: starts with a letter; letters, digits, "-" and "_" only. */
  pattern?: RegExp;
  /** Exporter leftovers to refuse, e.g. "Cube.001". */
  defaults?: RegExp;
  /** Which properties must be named. Default nodes, meshes and materials. */
  kinds?: NameKind[];
};

export type NameKind = "node" | "mesh" | "material" | "texture" | "animation";
export type NameIssue = {
  kind: NameKind;
  name: string;
  problem: "empty" | "default" | "pattern" | "duplicate";
  /** The new name, when `fix` renamed it. */
  fixed?: string;
};

export type FreightResult = {
  before: Stats;
  after: Stats;
  steps: string[];
  names: NameIssue[];
  warnings: string[];
};

const PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const DEFAULTS =
  /^(cube|sphere|cylinder|plane|cone|torus|circle|mesh|object|material|node|texture|image|untitled|scene|empty|primitive|geometry)([._ -]?\d+)?$|\.\d{3}$/i;

const TRIANGLES = Primitive.Mode.TRIANGLES;
const STRIP = Primitive.Mode.TRIANGLE_STRIP;
const FAN = Primitive.Mode.TRIANGLE_FAN;

function primitiveTriangles(p: Primitive): number {
  const indices = p.getIndices();
  const count = indices ? indices.getCount() : (p.getAttribute("POSITION")?.getCount() ?? 0);
  const mode = p.getMode();
  if (mode === TRIANGLES) return Math.floor(count / 3);
  if (mode === STRIP || mode === FAN) return Math.max(0, count - 2);
  return 0;
}

/** Measure a document. Pass `bytes` when you have the written GLB. */
export function inspect(doc: Document, bytes?: number): Stats {
  const root = doc.getRoot();
  let triangles = 0;
  let vertices = 0;
  let drawCalls = 0;
  for (const scene of root.listScenes()) {
    scene.traverse((node: Node) => {
      const mesh = node.getMesh();
      if (!mesh) return;
      for (const p of mesh.listPrimitives()) {
        triangles += primitiveTriangles(p);
        vertices += p.getAttribute("POSITION")?.getCount() ?? 0;
        drawCalls++;
      }
    });
  }
  const textures = root.listTextures().map((t: Texture) => {
    const image = t.getImage();
    const mimeType = t.getMimeType();
    const size = image ? ImageUtils.getSize(image, mimeType) : null;
    return {
      name: t.getName() || t.getURI() || "(unnamed)",
      mimeType,
      width: size?.[0] ?? 0,
      height: size?.[1] ?? 0,
      bytes: image?.byteLength ?? 0,
    };
  });
  return {
    ...(bytes === undefined ? {} : { bytes }),
    triangles,
    vertices,
    meshes: root.listMeshes().length,
    drawCalls,
    materials: root.listMaterials().length,
    nodes: root.listNodes().length,
    animations: root.listAnimations().length,
    textures,
    textureBytes: textures.reduce((sum, t) => sum + t.bytes, 0),
    maxTextureSize: textures.reduce((max, t) => Math.max(max, t.width, t.height), 0),
    extensions: root.listExtensionsUsed().map((e) => e.extensionName),
  };
}

/** Pass or fail every metric the budget sets. */
export function verdict(stats: Stats, budget: Budget): Verdict {
  const checks: Check[] = [];
  for (const metric of Object.keys(budget) as (keyof Budget)[]) {
    const limit = budget[metric];
    const value = stats[metric];
    if (limit === undefined || typeof value !== "number") continue;
    checks.push({ metric, value, limit, pass: value <= limit });
  }
  return { pass: checks.every((c) => c.pass), checks };
}

type Named = { getName(): string; setName(name: string): unknown };

function listByKind(doc: Document, kind: NameKind): Named[] {
  const root = doc.getRoot();
  switch (kind) {
    case "node":
      return root.listNodes();
    case "mesh":
      return root.listMeshes();
    case "material":
      return root.listMaterials();
    case "texture":
      return root.listTextures();
    case "animation":
      return root.listAnimations();
  }
}

/** A name that passes the default rules: invalid characters to "-", exporter suffixes dropped. */
export function cleanName(name: string, fallback: string): string {
  const stripped = name
    .replace(/\.\d{3}$/, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^[^A-Za-z]+/, "")
    .replace(/-+$/, "");
  return stripped && !DEFAULTS.test(stripped) ? stripped : fallback;
}

const FALLBACK: Record<NameKind, string> = {
  node: "part",
  mesh: "shape",
  material: "finish",
  texture: "map",
  animation: "clip",
};

/** A better source for a missing name: a node's mesh, or the node that draws a mesh. */
function related(item: Named, kind: NameKind): string {
  if (kind === "node") return (item as Node).getMesh()?.getName() ?? "";
  if (kind === "mesh") {
    const node = (item as Mesh).listParents().find((p) => p.propertyType === PropertyType.NODE);
    return (node as Node | undefined)?.getName() ?? "";
  }
  return "";
}

/** Check (and with `fix`, repair) names. Duplicates are checked per kind. */
export function checkNames(doc: Document, rules: NameRules & { fix?: boolean } = {}): NameIssue[] {
  const pattern = rules.pattern ?? PATTERN;
  const defaults = rules.defaults ?? DEFAULTS;
  const issues: NameIssue[] = [];
  for (const kind of rules.kinds ?? (["node", "mesh", "material"] as NameKind[])) {
    const seen = new Map<string, number>();
    listByKind(doc, kind).forEach((item, index) => {
      const name = item.getName();
      let problem: NameIssue["problem"] | null = null;
      if (!name) problem = "empty";
      else if (defaults.test(name)) problem = "default";
      else if (!pattern.test(name)) problem = "pattern";
      else if (seen.has(name)) problem = "duplicate";
      let final = name;
      if (problem && rules.fix) {
        const base = cleanName(
          name,
          cleanName(related(item, kind), `${FALLBACK[kind]}-${index + 1}`),
        );
        final = base;
        for (let n = 2; seen.has(final); n++) final = `${base}-${n}`;
        item.setName(final);
      }
      seen.set(final, (seen.get(final) ?? 0) + 1);
      if (problem) issues.push({ kind, name, problem, ...(rules.fix ? { fixed: final } : {}) });
    });
  }
  return issues;
}

const MIME: Record<TextureFormat, string> = {
  webp: "image/webp",
  avif: "image/avif",
  ktx2: "image/ktx2",
  png: "image/png",
  jpeg: "image/jpeg",
};
const EXTENSION: Record<string, string> = {
  "image/webp": "webp",
  "image/avif": "avif",
  "image/ktx2": "ktx2",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/** "data" for textures that hold numbers rather than colour (normals, roughness, occlusion). */
function textureRole(doc: Document, texture: Texture): "color" | "data" {
  for (const m of doc.getRoot().listMaterials() as Material[]) {
    if (m.getBaseColorTexture() === texture || m.getEmissiveTexture() === texture) return "color";
  }
  return "data";
}

async function textures(
  doc: Document,
  options: FreightOptions,
  steps: string[],
  warnings: string[],
): Promise<void> {
  const format = options.textures?.format ?? "keep";
  const maxSize = options.textures?.maxSize ?? 2048;
  const quality = options.textures?.quality ?? 82;
  const list = doc.getRoot().listTextures();
  if (list.length === 0) return;
  if (!options.encodeTexture) {
    if (
      format !== "keep" ||
      list.some((t) =>
        (ImageUtils.getSize(t.getImage() ?? new Uint8Array(), t.getMimeType()) ?? [0, 0]).some(
          (s) => s > maxSize,
        ),
      )
    ) {
      warnings.push("Textures were not resized or re-encoded: no texture encoder was given.");
    }
    return;
  }
  let changed = 0;
  for (const texture of list) {
    const image = texture.getImage();
    if (!image) continue;
    const mimeType = texture.getMimeType();
    const size = ImageUtils.getSize(image, mimeType) ?? [0, 0];
    const target: TextureFormat =
      format === "keep"
        ? ((EXTENSION[mimeType] === "jpg" ? "jpeg" : EXTENSION[mimeType]) as TextureFormat)
        : format;
    if (mimeType === MIME[target] && Math.max(...size) <= maxSize) continue;
    if (mimeType === "image/ktx2") {
      warnings.push(`${texture.getName() || texture.getURI()}: already KTX2, left as it is.`);
      continue;
    }
    const encoded = await options.encodeTexture(
      { image, mimeType, width: size[0], height: size[1] },
      { format: target, maxSize, quality, role: textureRole(doc, texture) },
    );
    if (!encoded) {
      warnings.push(
        `${texture.getName() || texture.getURI()}: could not encode as ${target}, kept.`,
      );
      continue;
    }
    texture.setImage(encoded.image).setMimeType(encoded.mimeType);
    const uri = texture.getURI();
    if (uri)
      texture.setURI(uri.replace(/\.[a-z0-9]+$/i, `.${EXTENSION[encoded.mimeType] ?? "bin"}`));
    changed++;
  }
  const used = new Set(
    doc
      .getRoot()
      .listTextures()
      .map((t) => t.getMimeType()),
  );
  if (used.has("image/webp")) doc.createExtension(EXTTextureWebP).setRequired(true);
  if (used.has("image/avif")) doc.createExtension(EXTTextureAVIF).setRequired(true);
  if (used.has("image/ktx2")) doc.createExtension(KHRTextureBasisu).setRequired(true);
  if (changed > 0)
    steps.push(
      `textures: ${changed} re-encoded (${format === "keep" ? "same format" : format}, max ${maxSize} px)`,
    );
}

/**
 * Run the preset on a document, in place: dedupe, prune, weld, names, textures,
 * compression. Measure before and after (without file sizes: the runners add those).
 */
export async function freight(doc: Document, options: FreightOptions = {}): Promise<FreightResult> {
  const steps: string[] = [];
  const warnings: string[] = [];
  const before = inspect(doc);
  const names = checkNames(doc, options.names ?? {});
  if (names.length > 0) {
    steps.push(
      `names: ${names.length} issue${names.length === 1 ? "" : "s"}${options.names?.fix ? ", renamed" : ""}`,
    );
  }
  const transforms = [];
  if (options.dedupe !== false) {
    transforms.push(
      dedup({
        propertyTypes: [
          PropertyType.ACCESSOR,
          PropertyType.MESH,
          PropertyType.TEXTURE,
          PropertyType.MATERIAL,
        ],
      }),
    );
    steps.push("dedupe: accessors, meshes, textures, materials");
  }
  if (options.prune !== false) {
    transforms.push(prune());
    steps.push("prune: unused nodes, materials, textures, attributes");
  }
  if (options.weld !== false) {
    transforms.push(weld());
    steps.push("weld: identical vertices merged, every primitive indexed");
  }
  if (options.join) {
    transforms.push(flatten(), join({ keepNamed: false }), prune());
    steps.push("join: hierarchy flattened, meshes sharing a material merged");
  }
  await doc.transform(...transforms);
  await textures(doc, options, steps, warnings);

  const compress = options.compress ?? "meshopt";
  if (compress === "meshopt") {
    if (options.meshoptEncoder) {
      await doc.transform(meshopt({ encoder: options.meshoptEncoder, level: "medium" }));
      steps.push("compress: Meshopt (EXT_meshopt_compression), quantized");
    } else {
      warnings.push("Meshopt was asked for but no encoder was given: geometry is not compressed.");
    }
  } else if (compress === "draco") {
    await doc.transform(draco({ method: "edgebreaker" }));
    steps.push("compress: Draco (KHR_draco_mesh_compression), edgebreaker");
  }
  return { before, after: inspect(doc), steps, names, warnings };
}

/** Which extensions a document needs registered on an IO to be written. */
export const WRITE_EXTENSIONS = [
  EXTMeshoptCompression,
  KHRDracoMeshCompression,
  EXTTextureWebP,
  EXTTextureAVIF,
  KHRTextureBasisu,
];

const kb = (n: number | undefined) => (n === undefined ? "n/a" : `${(n / 1024).toFixed(1)} kB`);

/** The result and verdict as Markdown, for a PR comment or a report folder. */
export function report(result: FreightResult, check?: Verdict, file = "model.glb"): string {
  const { before, after } = result;
  const rows: Array<[string, string, string]> = [
    ["File size", kb(before.bytes), kb(after.bytes)],
    ["Triangles", String(before.triangles), String(after.triangles)],
    ["Vertices", String(before.vertices), String(after.vertices)],
    ["Draw calls", String(before.drawCalls), String(after.drawCalls)],
    ["Materials", String(before.materials), String(after.materials)],
    [
      "Textures",
      `${before.textures.length}, ${kb(before.textureBytes)}`,
      `${after.textures.length}, ${kb(after.textureBytes)}`,
    ],
    ["Largest texture", `${before.maxTextureSize} px`, `${after.maxTextureSize} px`],
  ];
  const lines = [
    `# freight: ${file}`,
    "",
    check ? `**Verdict: ${check.pass ? "PASS" : "FAIL"}**` : "No budget given.",
    "",
    "| | Before | After |",
    "| --- | --- | --- |",
    ...rows.map((r) => `| ${r.join(" | ")} |`),
    "",
    "## Steps",
    "",
    ...result.steps.map((s) => `- ${s}`),
  ];
  if (check) {
    lines.push("", "## Budget", "", "| Metric | Value | Limit | |", "| --- | --- | --- | --- |");
    for (const c of check.checks)
      lines.push(`| ${c.metric} | ${c.value} | ${c.limit} | ${c.pass ? "pass" : "FAIL"} |`);
  }
  if (result.names.length) {
    lines.push("", "## Names", "");
    for (const n of result.names)
      lines.push(`- ${n.kind} "${n.name}": ${n.problem}${n.fixed ? `, renamed "${n.fixed}"` : ""}`);
  }
  if (result.warnings.length) {
    lines.push("", "## Warnings", "", ...result.warnings.map((w) => `- ${w}`));
  }
  return `${lines.join("\n")}\n`;
}

/** three.js's GLTFLoader key for a node name (PropertyBinding.sanitizeNodeName). */
export function threeName(name: string): string {
  return name.replace(/\s/g, "_").replace(/[[\].:/]/g, "");
}

const PHYSICAL = [
  "KHR_materials_clearcoat",
  "KHR_materials_transmission",
  "KHR_materials_sheen",
  "KHR_materials_iridescence",
  "KHR_materials_specular",
  "KHR_materials_ior",
  "KHR_materials_volume",
];

const pascal = (s: string): string =>
  s
    .replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, __, c: string) => c.toUpperCase())
    .replace(/^[^A-Za-z]+/, "") || "Model";

const tuple = (v: readonly number[]) => `[${v.map((n) => Number(n.toFixed(5))).join(", ")}]`;
const isIdentity = (v: readonly number[], identity: readonly number[]) =>
  v.every((n, i) => Math.abs(n - (identity[i] ?? 0)) < 1e-6);

/**
 * A typed React Three Fiber module for the model: its nodes and materials as types, and a
 * component that draws it through drei's `useGLTF`. Like gltfjsx's `--types` output,
 * generated from the document freight already holds.
 */
export function r3fModule(doc: Document, options: { url: string; component?: string }): string {
  const name = pascal(options.component ?? "Model");
  const type = `${name}GLTF`;
  const url = `${name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase()}_URL`;
  const nodes = new Map<string, "Mesh" | "Group" | "Object3D">();
  const materials = new Map<string, "MeshStandardMaterial" | "MeshPhysicalMaterial">();
  for (const m of doc.getRoot().listMaterials()) {
    const physical = m.listExtensions().some((e) => PHYSICAL.includes(e.extensionName));
    materials.set(
      threeName(m.getName() || "material"),
      physical ? "MeshPhysicalMaterial" : "MeshStandardMaterial",
    );
  }
  const jsx: string[] = [];
  const visit = (node: Node, depth: number) => {
    const key = threeName(node.getName());
    const mesh: Mesh | null = node.getMesh();
    const prims = mesh?.listPrimitives() ?? [];
    const pad = "  ".repeat(depth + 3);
    const transform = [
      isIdentity(node.getTranslation(), [0, 0, 0])
        ? ""
        : ` position={${tuple(node.getTranslation())}}`,
      isIdentity(node.getRotation(), [0, 0, 0, 1])
        ? ""
        : ` quaternion={${tuple(node.getRotation())}}`,
      isIdentity(node.getScale(), [1, 1, 1]) ? "" : ` scale={${tuple(node.getScale())}}`,
    ].join("");
    const children = node.listChildren();
    if (prims.length === 1 && children.length === 0 && key) {
      nodes.set(key, "Mesh");
      const material = prims[0]?.getMaterial();
      const mat = material
        ? `materials[${JSON.stringify(threeName(material.getName() || "material"))}]`
        : "undefined";
      jsx.push(
        `${pad}<mesh name=${JSON.stringify(key)} geometry={nodes[${JSON.stringify(key)}].geometry} material={${mat}}${transform} />`,
      );
      return;
    }
    if (prims.length > 1 && key) {
      // three.js loads a multi-primitive mesh as a group of meshes: keep it as loaded.
      nodes.set(key, "Group");
      jsx.push(`${pad}<primitive object={nodes[${JSON.stringify(key)}]} />`);
      return;
    }
    if (key) nodes.set(key, "Object3D");
    jsx.push(`${pad}<group${key ? ` name=${JSON.stringify(key)}` : ""}${transform}>`);
    for (const child of children) visit(child, depth + 1);
    jsx.push(`${pad}</group>`);
  };
  for (const scene of doc.getRoot().listScenes())
    for (const child of scene.listChildren()) visit(child, 0);

  const used = new Set<string>([...nodes.values(), ...materials.values()]);
  const entries = (map: Map<string, string>) =>
    [...map].map(([k, v]) => `    ${JSON.stringify(k)}: ${v};`).join("\n");
  return `// ${name}: typed by @quartifex/freight from ${options.url}. Regenerate rather than edit.
import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import type { ${[...used].sort().join(", ")} } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export const ${url} = ${JSON.stringify(options.url)};

export type ${type} = GLTF & {
  nodes: {
${entries(nodes)}
  };
  materials: {
${entries(materials)}
  };
};

export function ${name}(props: ThreeElements["group"]) {
  const { nodes, materials } = useGLTF(${url}) as unknown as ${type};
  return (
    <group {...props} dispose={null}>
${jsx.join("\n")}
    </group>
  );
}

useGLTF.preload(${url});
`;
}
