export type BrahmandState = "photograph" | "universe";

export type BrahmandOptions = {
  reducedMotion: boolean;
  /** Called whenever the piece starts turning into the other state. */
  onState(state: BrahmandState): void;
};

export type BrahmandHandle = {
  /** How many particles are simulated. */
  points: number;
  /** Let the photograph go, or call it home. */
  toggle(): void;
  setSound(on: boolean): void;
  /** Resolves false when the file cannot be read as an image. The file never leaves the page. */
  setPhoto(file: Blob): Promise<boolean>;
  dispose(): void;
};

/** Rejects with Error("webgpu-unavailable") where WebGPU is missing. */
export function createBrahmand(
  canvas: HTMLCanvasElement,
  options: BrahmandOptions,
): Promise<BrahmandHandle>;
