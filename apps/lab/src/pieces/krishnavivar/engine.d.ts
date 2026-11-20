import type { PieceHandle, PieceOptions } from "../types";

export type KrishnavivarHandle = PieceHandle & {
  /** Hangs the visitor's photo far behind the hole, to be lensed. Resolves false if it cannot be read. */
  setPhoto(file: Blob): Promise<boolean>;
};

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing. */
export function createKrishnavivar(
  canvas: HTMLCanvasElement,
  options: PieceOptions,
): Promise<KrishnavivarHandle>;
