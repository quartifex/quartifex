"use client";

// One reel, staged by safeframe for its own size, with the tier chosen by resolve for a
// given screen. Used for every device frame in the playground.
import { createReel, type Reel } from "@quartifex/reel";
import { type Decision, decide, type EffectiveType, targetFromManifest } from "@quartifex/resolve";
import type { Manifest } from "@quartifex/rushes/manifest";
import { type Frame, frame } from "@quartifex/safeframe";
import { useEffect, useMemo, useRef } from "react";
import { SCENE, SEQUENCE_URL } from "@/scene/scene";
import { Overlay } from "./Overlay";
import styles from "./StagedReel.module.css";

export type Screen = { width: number; height: number; dpr: number };

export function StagedReel({
  manifest,
  screen,
  progress,
  reducedMotion,
  guides,
  label,
  scale,
  network,
}: {
  manifest: Manifest;
  /** The connection resolve assumes for this screen. */
  network: EffectiveType;
  screen: Screen;
  /** How large the preview is shown, relative to the screen's CSS size. */
  scale: number;
  progress: number;
  reducedMotion: boolean;
  guides: boolean;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reel = useRef<Reel | null>(null);
  const staged: Frame = useMemo(() => frame(SCENE, screen), [screen]);
  const decision: Decision = useMemo(
    () =>
      decide(
        { ...screen, gpuTier: 2, effectiveType: network },
        targetFromManifest(manifest, { box: screen }),
      ),
    [manifest, screen, network],
  );

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    // Load the tier the real device would get, but draw only as many pixels as the
    // preview shows: a 3440 px screen previewed at 430 px wide needs a 430 px canvas.
    const shown = Math.max(scale * (window.devicePixelRatio || 1), 0.1);
    const created = createReel(el, manifest, {
      baseUrl: SEQUENCE_URL,
      tier: decision.tier.name,
      environment: { width: screen.width, height: screen.height, dpr: shown, gpuTier: 3 },
      reducedMotion,
      stage: (box) => frame(SCENE, box),
    });
    reel.current = created;
    return () => {
      created.destroy();
      reel.current = null;
    };
  }, [manifest, screen, reducedMotion, decision.tier.name, scale]);

  useEffect(() => {
    reel.current?.seek(progress);
  }, [progress]);

  return (
    <div className={styles.screen} style={{ width: screen.width, height: screen.height }}>
      <canvas
        ref={canvas}
        className={styles.canvas}
        role="img"
        aria-label={`${label}: the QUASAR reveal (concept visual)`}
      />
      {guides && <Overlay staged={staged} decision={decision} />}
    </div>
  );
}
