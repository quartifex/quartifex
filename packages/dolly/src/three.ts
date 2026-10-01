// three.js glue for @quartifex/dolly, published as `@quartifex/dolly/three`. Duck-typed:
// no three.js import, so any PerspectiveCamera (three, R3F) works.
import type { CameraState, Vec3 } from "./index.js";

export type PerspectiveCameraLike = {
  fov: number;
  position: { set(x: number, y: number, z: number): unknown };
  lookAt(x: number, y: number, z: number): void;
  updateProjectionMatrix(): void;
};

/** Put a camera where the rig says. */
export function applyToCamera(camera: PerspectiveCameraLike, state: CameraState): void {
  camera.position.set(...state.position);
  camera.lookAt(...state.target);
  if (Math.abs(camera.fov - state.fov) > 1e-3) {
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
  }
}

/** Points along a path's position spline, for drawing it (e.g. drei's <Line>). */
export function pathPoints(
  sampleAt: (progress: number) => { position: Vec3 },
  segments = 64,
): Vec3[] {
  return Array.from({ length: segments + 1 }, (_, i) => sampleAt(i / segments).position);
}
