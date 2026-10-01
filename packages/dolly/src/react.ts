// React Three Fiber adapter for @quartifex/dolly, published as `@quartifex/dolly/react`.
// @react-three/fiber is an optional peer, needed only for this entry point.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { type CameraPath, type CameraState, createRig, type RigOptions } from "./index.js";
import { applyToCamera, type PerspectiveCameraLike } from "./three.js";

/**
 * Drive the R3F default camera along `path`. `progress` is read every frame, so pass a ref
 * or a function (scroll position, a ScrollTrigger, a slider) rather than React state.
 * `bucket` picks per-bucket keys (safeframe bucket names). Returns the latest state ref.
 */
export function useDolly(
  path: CameraPath,
  progress: () => number,
  options: RigOptions & { bucket?: string } = {},
) {
  const { damping, reducedMotion, compensate, bucket } = options;
  const rig = useMemo(
    () =>
      createRig(path, {
        ...(damping === undefined ? {} : { damping }),
        ...(reducedMotion === undefined ? {} : { reducedMotion }),
        ...(compensate === undefined ? {} : { compensate }),
      }),
    [path, damping, reducedMotion, compensate],
  );
  const camera = useThree((s) => s.camera) as unknown as PerspectiveCameraLike;
  const size = useThree((s) => s.size);
  const state = useRef<CameraState>(rig.state);
  const read = useRef(progress);
  read.current = progress;

  // Start where the scroll already is, without a damped sweep from the first key.
  useEffect(() => {
    state.current = rig.snap(read.current(), size.width / Math.max(size.height, 1), bucket);
    applyToCamera(camera, state.current);
  }, [rig, camera, bucket, size.width, size.height]);

  useFrame((_, dt) => {
    state.current = rig.update(
      read.current(),
      Math.min(dt, 0.1),
      size.width / Math.max(size.height, 1),
      bucket,
    );
    applyToCamera(camera, state.current);
  });
  return state;
}
