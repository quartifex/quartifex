// React adapter for @quartifex/volumetric, published as `@quartifex/volumetric/react`: the
// canvas variant as a component, laid over whatever it is placed in (an image sequence, a
// hero image). It only adds light (`mix-blend-mode: screen`) and ignores the pointer.
import { type CSSProperties, useEffect, useRef } from "react";
import type { Settings, VolumetricQuality } from "./index.js";
import { createOverlay, type Overlay } from "./overlay.js";

export type VolumetricOverlayProps = {
  settings?: Partial<Settings>;
  quality?: VolumetricQuality;
  /** Default: the visitor's `prefers-reduced-motion`. */
  reducedMotion?: boolean;
  seed?: number;
  className?: string;
  style?: CSSProperties;
};

const COVER: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  mixBlendMode: "screen",
};

export function VolumetricOverlay({
  settings,
  quality,
  reducedMotion,
  seed,
  className,
  style,
}: VolumetricOverlayProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<Overlay | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: created once per seed; the rest update below
  useEffect(() => {
    if (!canvas.current) return;
    const created = createOverlay(canvas.current, {
      ...(settings ? { settings } : {}),
      ...(quality ? { quality } : {}),
      ...(reducedMotion === undefined ? {} : { reducedMotion }),
      ...(seed === undefined ? {} : { seed }),
    });
    overlay.current = created;
    return () => {
      created.destroy();
      overlay.current = null;
    };
  }, [seed]);
  useEffect(() => {
    if (settings) overlay.current?.update(settings);
  }, [settings]);
  useEffect(() => {
    if (quality) overlay.current?.setQuality(quality);
  }, [quality]);
  useEffect(() => {
    if (reducedMotion !== undefined) overlay.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas without a tabindex is not focusable; the light is decorative
    <canvas
      ref={canvas}
      className={className}
      style={{ ...COVER, ...style }}
      aria-hidden="true"
      data-volumetric="overlay"
    />
  );
}
