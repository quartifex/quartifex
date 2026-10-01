// React adapter for @quartifex/freight, published as `@quartifex/freight/react`.
import { type RefObject, useEffect, useRef } from "react";
import { create, type Instance, type Options } from "./index.js";

/** Attach freight to an element for the lifetime of the component. */
export function useInstance<T extends Element>(options: Options = {}): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { reducedMotion } = options;

  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    const instance: Instance = create(target, reducedMotion === undefined ? {} : { reducedMotion });
    return () => instance.destroy();
  }, [reducedMotion]);

  return ref;
}
