"use client";

// Posters for the Lab gallery: each built seed drawn small and still, from its own code, so a
// visitor recognises the effect before opening it. Static by design: nothing to stop under
// reduced motion. Seeds without one show their icon.
import { type ComponentType, type ReactNode, useEffect, useRef, useState } from "react";
import { SceneView } from "@/scene/SceneView";
import { guideFromFrame, type Layer, Overlay } from "./frameguide/Overlay";
import styles from "./posters.module.css";

/**
 * Lays out a fixed 320 x 180 design and scales it to the card's width. Children get the
 * pixel ratio that draws only what the card shows (scale x the window's ratio).
 */
function Fit({ children }: { children: (dpr: number) => ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / 320);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} className={styles.poster} aria-hidden="true">
      <div
        className={styles.design}
        style={{ transform: `scale(${scale ?? 1})`, visibility: scale ? undefined : "hidden" }}
      >
        {children(Math.max(0.25, Math.min(2, (scale ?? 1) * (globalThis.devicePixelRatio || 1))))}
      </div>
    </div>
  );
}

const GUIDES: ReadonlySet<Layer> = new Set(["safe", "subject", "focal", "text"]);

function FrameguidePoster() {
  return (
    <Fit>
      {(dpr) => (
        <SceneView
          report={false}
          width={320}
          height={180}
          dpr={dpr}
          mode="safeframe"
          progress={0.35}
          copy={false}
          overlay={(frame) => <Overlay guide={guideFromFrame(frame)} layers={GUIDES} />}
        />
      )}
    </Fit>
  );
}

function AspectMorphPoster() {
  return (
    <Fit>
      {(dpr) => (
        <div className={styles.row}>
          {(
            [
              [56, 100],
              [100, 100],
              [133, 100],
            ] as const
          ).map(([width, height]) => (
            <div key={width} className={styles.cell}>
              <SceneView
                report={false}
                width={width}
                height={height}
                dpr={dpr}
                mode="safeframe"
                progress={0.35}
                copy={false}
              />
              <span>{width === 56 ? "9:16" : width === 100 ? "1:1" : "4:3"}</span>
            </div>
          ))}
        </div>
      )}
    </Fit>
  );
}

export const posters: Record<string, ComponentType | undefined> = {
  frameguide: FrameguidePoster,
  "aspect-morph": AspectMorphPoster,
};
