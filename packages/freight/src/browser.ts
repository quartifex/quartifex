// In-browser runner for @quartifex/freight, published as `@quartifex/freight/browser`: the
// same preset on a GLB in memory, with textures re-encoded through a canvas (WebP, PNG or
// JPEG; AVIF and KTX2 need the Node runner) and Meshopt when you pass meshoptimizer in.
import { WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  type Budget,
  type FreightOptions,
  type FreightResult,
  freight,
  inspect,
  r3fModule,
  report,
  type TextureEncoder,
  type Verdict,
  verdict,
} from "./index.js";

export * from "./index.js";

const CANVAS_MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpeg: "image/jpeg",
};

/** Texture encoder through a canvas. Returns null where the browser cannot write the format. */
export const canvasEncoder: TextureEncoder = async (input, target) => {
  const type = CANVAS_MIME[target.format];
  if (!type) return null;
  const bitmap = await createImageBitmap(
    new Blob([input.image as BlobPart], { type: input.mimeType }),
  );
  const scale = Math.min(1, target.maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type, quality: target.quality / 100 });
  // Some browsers quietly fall back to PNG for formats they cannot write.
  if (blob.type !== type) return null;
  return { image: new Uint8Array(await blob.arrayBuffer()), mimeType: type, width, height };
};

export type MeshoptModule = {
  MeshoptEncoder: { ready: Promise<void> };
  MeshoptDecoder: { ready: Promise<void> };
};

export type BufferOptions = Omit<FreightOptions, "encodeTexture" | "meshoptEncoder"> & {
  budget?: Budget;
  /** `import * as meshopt from "meshoptimizer"`, for "meshopt" compression. */
  meshopt?: MeshoptModule;
  file?: string;
  /** Also generate the typed React Three Fiber module for this URL. */
  types?: { url: string; component?: string };
};

export type BufferResult = {
  glb: Uint8Array;
  result: FreightResult;
  verdict?: Verdict;
  markdown: string;
  tsx?: string;
};

/** Run the preset on a GLB in memory and return the optimised GLB with its report. */
export async function freightBuffer(
  input: ArrayBuffer | Uint8Array,
  options: BufferOptions = {},
): Promise<BufferResult> {
  if (options.compress === "draco") throw new Error("freight/browser: Draco needs the Node runner");
  const io = new WebIO().registerExtensions(ALL_EXTENSIONS);
  if (options.meshopt) {
    await options.meshopt.MeshoptEncoder.ready;
    await options.meshopt.MeshoptDecoder.ready;
    io.registerDependencies({
      "meshopt.encoder": options.meshopt.MeshoptEncoder,
      "meshopt.decoder": options.meshopt.MeshoptDecoder,
    });
  }
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const doc = await io.readBinary(bytes);
  const result = await freight(doc, {
    ...options,
    encodeTexture: canvasEncoder,
    ...(options.meshopt ? { meshoptEncoder: options.meshopt.MeshoptEncoder } : {}),
  });
  const glb = await io.writeBinary(doc);
  result.before.bytes = bytes.byteLength;
  result.after = inspect(doc, glb.byteLength);
  const check = options.budget ? verdict(result.after, options.budget) : undefined;
  return {
    glb,
    result,
    ...(check ? { verdict: check } : {}),
    markdown: report(result, check, options.file ?? "model.glb"),
    ...(options.types ? { tsx: r3fModule(doc, options.types) } : {}),
  };
}
