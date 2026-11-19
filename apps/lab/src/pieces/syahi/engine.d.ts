import type { PieceHandle, PieceOptions } from "../types";

/** Throws Error("unsupported") where WebGL 2 is missing. */
export function createSyahi(canvas: HTMLCanvasElement, options: PieceOptions): PieceHandle;
