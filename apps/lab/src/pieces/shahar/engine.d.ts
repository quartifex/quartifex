import type { PieceHandle, PieceOptions } from "../types";

export type ShaharOptions = PieceOptions & {
  /** Where the city files are served from, without a trailing slash. */
  assets: string;
};

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing, and if its data cannot be loaded. */
export function createShahar(
  canvas: HTMLCanvasElement,
  options: ShaharOptions,
): Promise<PieceHandle>;
