import type { PieceHandle, PieceOptions } from "../types";

export type VarshaOptions = PieceOptions & {
  /** Where climate.bin and earth.jpg are served from, without a trailing slash. */
  assets: string;
};

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing, and if its data cannot be loaded. */
export function createVarsha(
  canvas: HTMLCanvasElement,
  options: VarshaOptions,
): Promise<PieceHandle>;
