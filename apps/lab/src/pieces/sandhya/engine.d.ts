import type { PieceHandle, PieceOptions } from "../types";

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing. */
export function createSandhya(
  canvas: HTMLCanvasElement,
  options: PieceOptions,
): Promise<PieceHandle>;
