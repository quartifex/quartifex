// React adapter for @quartifex/plumb, published as `@quartifex/plumb/react`.
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createPlumb, type Listener, type Plumb, type Viewport } from "./index.js";

// One shared instance per page, created on first use and destroyed when the last
// component using it unmounts.
let shared: Plumb | null = null;
let users = 0;

function acquire(): Plumb {
  shared ??= createPlumb();
  users += 1;
  return shared;
}

function release() {
  users -= 1;
  if (users <= 0 && shared) {
    shared.destroy();
    shared = null;
    users = 0;
  }
}

/**
 * The page's stable viewport. Re-renders once per settled layout change, or on every
 * toolbar and keyboard frame with `{ all: true }`. Returns `null` during server rendering.
 */
export function usePlumb(options: { all?: boolean } = {}): Viewport | null {
  const { all = false } = options;
  // The snapshot only moves when this hook is notified, so toolbar frames do not leak
  // into components that asked for layout changes only.
  const snapshot = useRef<Viewport | null>(null);
  const subscribe = useCallback(
    (onChange: () => void) => {
      const plumb = acquire();
      const notify = (viewport: Viewport) => {
        snapshot.current = viewport;
        onChange();
      };
      const unsubscribe = plumb.subscribe(notify, { all });
      notify(plumb.viewport);
      return () => {
        unsubscribe();
        release();
      };
    },
    [all],
  );
  return useSyncExternalStore(
    subscribe,
    () => snapshot.current,
    () => null,
  );
}

/** Run `callback` once per settled layout change, without re-rendering. */
export function useViewportChange(callback: Listener): void {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    const plumb = acquire();
    const unsubscribe = plumb.subscribe((viewport, change) => latest.current(viewport, change));
    return () => {
      unsubscribe();
      release();
    };
  }, []);
}
