// A small GLB (binary glTF 2.0) reader: enough to weigh a model without loading it.
// No Node APIs, so it also runs in the browser.

export type GlbInfo = {
  bytes: number;
  meshes: number;
  primitives: number;
  vertices: number;
  triangles: number;
  materials: number;
  textures: number;
  /** Embedded images (in the binary chunk) and their sizes. */
  images: Array<{ mimeType: string; bytes: number }>;
  imageBytes: number;
  /** Images referenced by URI (external files or data URIs), not counted in `imageBytes`. */
  externalImages: number;
  /** Extensions the model uses, e.g. KHR_draco_mesh_compression, EXT_meshopt_compression. */
  extensions: string[];
};

type Accessor = { count: number };
type Primitive = { attributes: Record<string, number>; indices?: number; mode?: number };
type Gltf = {
  meshes?: Array<{ primitives?: Primitive[] }>;
  accessors?: Accessor[];
  materials?: unknown[];
  textures?: unknown[];
  images?: Array<{ bufferView?: number; mimeType?: string; uri?: string }>;
  bufferViews?: Array<{ byteLength: number }>;
  extensionsUsed?: string[];
};

const MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK = 0x4e4f534a; // "JSON"

/** Read a GLB's header and JSON chunk. Throws on anything that is not GLB version 2. */
export function parseGlb(data: Uint8Array | ArrayBuffer): GlbInfo {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== MAGIC)
    throw new Error("heft: not a GLB file");
  if (view.getUint32(4, true) !== 2) throw new Error("heft: only glTF 2.0 GLB is supported");
  const chunkLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== JSON_CHUNK) throw new Error("heft: GLB has no JSON chunk first");
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + chunkLength))) as Gltf;

  let primitives = 0;
  let vertices = 0;
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitives++;
      const position = json.accessors?.[primitive.attributes.POSITION ?? -1]?.count ?? 0;
      vertices += position;
      const mode = primitive.mode ?? 4;
      const count =
        primitive.indices === undefined
          ? position
          : (json.accessors?.[primitive.indices]?.count ?? 0);
      // 4 triangles, 5 strip, 6 fan; points and lines draw no triangles.
      if (mode === 4) triangles += Math.floor(count / 3);
      else if (mode === 5 || mode === 6) triangles += Math.max(0, count - 2);
    }
  }
  const images: GlbInfo["images"] = [];
  let externalImages = 0;
  for (const image of json.images ?? []) {
    if (image.bufferView !== undefined) {
      images.push({
        mimeType: image.mimeType ?? "application/octet-stream",
        bytes: json.bufferViews?.[image.bufferView]?.byteLength ?? 0,
      });
    } else if (image.uri) externalImages++;
  }
  return {
    bytes: bytes.byteLength,
    meshes: json.meshes?.length ?? 0,
    primitives,
    vertices,
    triangles,
    materials: json.materials?.length ?? 0,
    textures: json.textures?.length ?? 0,
    images,
    imageBytes: images.reduce((sum, i) => sum + i.bytes, 0),
    externalImages,
    extensions: json.extensionsUsed ?? [],
  };
}
