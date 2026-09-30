// React adapter for @quartifex/safeframe, published as `@quartifex/safeframe/react`.
import { type RefObject, useEffect, useRef, useState } from "react";
import { createSafeframe, type Frame, type SafeframeOptions, type Scene } from "./index.js";

/**
 * Stage `scene` inside the element the returned ref is attached to. Returns the ref and
 * the current staging (null until the element mounts). A new `scene` object re-stages.
 */
export function useSafeframe<T extends HTMLElement>(
  scene: Scene,
  options: Omit<SafeframeOptions, "onFrame"> = {},
): [RefObject<T | null>, Frame | null] {
  const ref = useRef<T | null>(null);
  const [staged, setStaged] = useState<Frame | null>(null);
  const { viewport, fit, buckets, writeVars } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const instance = createSafeframe(element, scene, {
      onFrame: setStaged,
      ...(viewport ? { viewport } : {}),
      ...(fit ? { fit } : {}),
      ...(buckets ? { buckets } : {}),
      ...(writeVars === undefined ? {} : { writeVars }),
    });
    return () => instance.destroy();
  }, [scene, viewport, fit, buckets, writeVars]);

  return [ref, staged];
}
