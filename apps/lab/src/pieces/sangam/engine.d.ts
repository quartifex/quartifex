import type { PieceHandle, PieceOptions } from "../types";

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing. */
export function createSangam(
  canvas: HTMLCanvasElement,
  options: PieceOptions,
): Promise<PieceHandle>;
