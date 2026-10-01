// React Three Fiber adapter for @quartifex/anatomy, published as `@quartifex/anatomy/react`.
// @react-three/fiber and @react-three/drei are optional peers, needed only here.
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { Group } from "three";
import type { Exploded } from "./index.js";
import { createExplosion, type Explosion, type ExplosionOptions } from "./three.js";

export type AnatomyProps = ExplosionOptions & {
  /** Read every frame: a ref, a scroll position, a ScrollTrigger's progress. */
  progress: () => number;
  /** Show labels for parts with `userData.label`. Default true. */
  annotations?: boolean;
  /** Called when the set of visible labels changes, e.g. to mirror them in an accessible list. */
  onAnnotations?: (annotations: Exploded["annotations"]) => void;
  children: ReactNode;
};

/** Wrap a model: its children explode as `progress` runs from 0 to 1. */
export function Anatomy({
  progress,
  annotations = true,
  onAnnotations,
  children,
  ...options
}: AnatomyProps) {
  const group = useRef<Group>(null);
  const explosion = useRef<Explosion | null>(null);
  const [labels, setLabels] = useState<Exploded["annotations"]>([]);
  const signature = useRef("");
  const { mode, axis, distance, stagger, ease, levels } = options;

  useLayoutEffect(() => {
    if (!group.current) return;
    const created = createExplosion(group.current, {
      ...(mode ? { mode } : {}),
      ...(axis ? { axis } : {}),
      ...(distance === undefined ? {} : { distance }),
      ...(stagger === undefined ? {} : { stagger }),
      ...(ease ? { ease } : {}),
      ...(levels === undefined ? {} : { levels }),
    });
    explosion.current = created;
    return () => {
      created.reset();
      explosion.current = null;
    };
  }, [mode, axis, distance, stagger, ease, levels]);

  useFrame(() => {
    const result = explosion.current?.set(progress());
    if (!result) return;
    // Re-render only when which labels show, or where, changes noticeably.
    const next = result.annotations
      .map((a) => `${a.id}:${a.visible ? 1 : 0}:${a.position.map((n) => n.toFixed(2)).join(",")}`)
      .join("|");
    if (next !== signature.current) {
      signature.current = next;
      setLabels(result.annotations);
      onAnnotations?.(result.annotations);
    }
  });

  return (
    <group ref={group}>
      {children}
      {annotations &&
        labels
          .filter((a) => a.visible)
          .map((a) => (
            <Html key={a.id} position={a.position} center zIndexRange={[10, 0]}>
              <span data-anatomy-label={a.id} aria-hidden="true">
                {a.label}
              </span>
            </Html>
          ))}
    </group>
  );
}
