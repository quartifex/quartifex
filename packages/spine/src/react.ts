// React adapter for @quartifex/spine, published as `@quartifex/spine/react`.
import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createSpine, type Spine, type SpineOptions } from "./index.js";

const Context = createContext<Spine | null>(null);

/** One spine for the app. Mount it once, high in the tree (e.g. the root layout). */
export function SpineProvider({ children, ...options }: SpineOptions & { children: ReactNode }) {
  const [spine, setSpine] = useState<Spine | null>(null);
  const initial = useRef(options);
  useEffect(() => {
    const created = createSpine(initial.current);
    setSpine(created);
    return () => created.destroy();
  }, []);
  return createElement(Context.Provider, { value: spine }, children);
}

/** The app's spine, or null before it has mounted. */
export function useSpine(): Spine | null {
  return useContext(Context);
}

/**
 * Create GSAP animations for this component, scoped to the current route: reverted when
 * the component unmounts or the route changes, newest first, so pins come apart cleanly.
 */
export function useSpineScope(
  fn: () => void,
  deps: readonly unknown[] = [],
  element?: { current: Element | null },
) {
  const spine = useSpine();
  const latest = useRef(fn);
  latest.current = fn;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the caller's deps decide when to rebuild
  useEffect(() => {
    if (!spine) return;
    return spine.scope(() => latest.current(), element?.current ?? undefined);
  }, [spine, ...deps]);
}
