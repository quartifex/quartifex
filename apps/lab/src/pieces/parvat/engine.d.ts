import type { PieceHandle, PieceOptions } from "../types";

/** Throws Error("unsupported") where WebGL 2 is missing. */
export function createParvat(canvas: HTMLCanvasElement, options: PieceOptions): PieceHandle;
