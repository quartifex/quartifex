// Builds small GLB files for tests: a JSON chunk and an optional binary chunk.

function pad(bytes: Uint8Array, fill: number): Uint8Array {
  const length = Math.ceil(bytes.byteLength / 4) * 4;
  const out = new Uint8Array(length).fill(fill);
  out.set(bytes);
  return out;
}

/** A GLB with `json` as its JSON chunk and `binary` (if any) as its BIN chunk. */
export function makeGlb(json: object, binary?: Uint8Array): Uint8Array {
  const jsonBytes = pad(new TextEncoder().encode(JSON.stringify(json)), 0x20);
  const bin = binary ? pad(binary, 0) : null;
  const total = 12 + 8 + jsonBytes.byteLength + (bin ? 8 + bin.byteLength : 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.byteLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  if (bin) {
    const at = 20 + jsonBytes.byteLength;
    view.setUint32(at, bin.byteLength, true);
    view.setUint32(at + 4, 0x004e4942, true);
    out.set(bin, at + 8);
  }
  return out;
}

/** A model with `triangles` indexed triangles and one embedded PNG of `imageBytes`. */
export function makeModel(triangles: number, imageBytes = 0): Uint8Array {
  return makeGlb(
    {
      asset: { version: "2.0" },
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      accessors: [{ count: triangles * 3 }, { count: triangles * 3 }],
      materials: [{}],
      textures: imageBytes ? [{ source: 0 }] : [],
      images: imageBytes ? [{ bufferView: 0, mimeType: "image/png" }] : [],
      bufferViews: imageBytes ? [{ buffer: 0, byteLength: imageBytes }] : [],
      extensionsUsed: ["KHR_materials_unlit"],
    },
    imageBytes ? new Uint8Array(imageBytes) : undefined,
  );
}
