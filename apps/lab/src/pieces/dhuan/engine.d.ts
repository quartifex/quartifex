import type { PieceHandle, PieceOptions } from "../types";

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing. */
export function createDhuan(canvas: HTMLCanvasElement, options: PieceOptions): Promise<PieceHandle>;
