// React Three Fiber adapter for @quartifex/understudy, published as
// `@quartifex/understudy/r3f`. Feeds frame times to the governor, applies its pixel ratio and
// shadows to the renderer, and demotes on context loss. Read the rest with `useQuality`.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useSyncExternalStore } from "react";
import { type Quality, type Understudy, watchContext } from "./index.js";

const FALLBACK: Quality = { dpr: 1, shadows: true, post: true, particles: 1 };

/** The governor's current quality, re-rendering when it changes. */
export function useQuality(understudy: Understudy | null): Quality {
  return useSyncExternalStore(
    (notify) => understudy?.subscribe(notify) ?? (() => {}),
    () => understudy?.state.quality ?? FALLBACK,
    () => FALLBACK,
  );
}

/**
 * Put inside the Canvas. `frameTime` overrides the measured frame time (tests, demos);
 * return undefined to measure.
 */
export function Governor({
  understudy,
  frameTime,
}: {
  understudy: Understudy;
  frameTime?: () => number | undefined;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const setDpr = useThree((s) => s.setDpr);
  const quality = useQuality(understudy);

  useFrame((_, delta) => understudy.frame(frameTime?.() ?? delta * 1000));
  useEffect(() => setDpr(quality.dpr), [quality.dpr, setDpr]);
  useEffect(() => {
    if (gl.shadowMap.enabled === quality.shadows) return;
    gl.shadowMap.enabled = quality.shadows;
    // Materials compile shadow code in or out: they need recompiling.
    scene.traverse((object) => {
      const material = (
        object as { material?: { needsUpdate: boolean } | { needsUpdate: boolean }[] }
      ).material;
      for (const m of Array.isArray(material) ? material : material ? [material] : [])
        m.needsUpdate = true;
    });
  }, [gl, scene, quality.shadows]);
  useEffect(() => watchContext(gl.domElement, understudy), [gl, understudy]);
  return null;
}
