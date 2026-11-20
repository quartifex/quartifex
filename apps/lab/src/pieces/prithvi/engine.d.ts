import type { PieceHandle, PieceOptions } from "../types";

export type PrithviOptions = PieceOptions & {
  /** Where the textures built by scripts/prithvi-data.mjs are served from, without a trailing slash. */
  assets: string;
};

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing, and if a texture cannot be loaded. */
export function createPrithvi(
  canvas: HTMLCanvasElement,
  options: PrithviOptions,
): Promise<PieceHandle>;
