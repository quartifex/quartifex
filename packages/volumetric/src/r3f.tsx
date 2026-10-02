// React Three Fiber adapter for @quartifex/volumetric, published as
// `@quartifex/volumetric/r3f`. Put <VolumetricLight> inside the Canvas: it takes over the
// final render (useFrame priority 1) to draw the scene with its light shafts. It reads the
// R3F camera every frame, so a camera driven by dolly keeps the shafts on the light through
// every chapter. @react-three/fiber is an optional peer.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Settings, VolumetricQuality } from "./index.js";
import { createVolumetric } from "./three.js";

export type VolumetricLightProps = {
  settings?: Partial<Settings>;
  /** e.g. `qualityFor({ gpuTier, quality: useQuality(understudy) })`. */
  quality?: VolumetricQuality;
  reducedMotion?: boolean;
  /** The light's world position; without it `settings.source` places it on screen. */
  sun?: [number, number, number];
};

export function VolumetricLight({ settings, quality, reducedMotion, sun }: VolumetricLightProps) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const pass = useMemo(() => createVolumetric(gl), [gl]);
  const start = useRef(performance.now());

  useEffect(() => () => pass.dispose(), [pass]);
  useEffect(() => {
    pass.setSize(Math.round(size.width * dpr), Math.round(size.height * dpr));
  }, [pass, size, dpr]);
  useEffect(() => {
    if (settings) pass.update(settings);
  }, [pass, settings]);
  useEffect(() => {
    if (quality) pass.setQuality(quality);
  }, [pass, quality]);
  useEffect(() => {
    pass.setReducedMotion(Boolean(reducedMotion));
  }, [pass, reducedMotion]);
  const [sx, sy, sz] = sun ?? [];
  useEffect(() => {
    pass.setSun(sx === undefined || sy === undefined || sz === undefined ? null : [sx, sy, sz]);
  }, [pass, sx, sy, sz]);

  useFrame((state) => {
    pass.render(state.scene, state.camera, (performance.now() - start.current) / 1000);
  }, 1);
  return null;
}
