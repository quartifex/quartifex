import type { PieceHandle, PieceOptions } from "../types";

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing. */
export function createNadi(canvas: HTMLCanvasElement, options: PieceOptions): Promise<PieceHandle>;
