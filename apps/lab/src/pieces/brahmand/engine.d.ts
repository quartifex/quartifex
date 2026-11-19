import type { PieceHandle, PieceOptions } from "../types";

export type BrahmandHandle = PieceHandle & {
  /** Let the photograph go, or call it home. */
  toggle(): void;
  /** Resolves false when the file cannot be read as an image. The file never leaves the page. */
  setPhoto(file: Blob): Promise<boolean>;
};

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing. */
export function createBrahmand(
  canvas: HTMLCanvasElement,
  options: PieceOptions,
): Promise<BrahmandHandle>;
