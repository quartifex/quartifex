import type { PieceHandle, PieceOptions } from "../types";

export type UdaanOptions = PieceOptions & {
  /** Where flights.bin, earth.jpg and night.jpg are served from, without a trailing slash. */
  assets: string;
};

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing, and if its data cannot be loaded. */
export function createUdaan(canvas: HTMLCanvasElement, options: UdaanOptions): Promise<PieceHandle>;
