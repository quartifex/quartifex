// React adapter for @quartifex/viewfinder, published as `@quartifex/viewfinder/react`.
import { useEffect, useRef, useState } from "react";
import { createViewfinder, type Viewfinder, type ViewfinderOptions } from "./index.js";

/**
 * Mount the overlay for the component's lifetime (typically only in development or behind
 * a flag). Sources are read live, so pass a stable array.
 */
export function useViewfinder(options: ViewfinderOptions = {}, enabled = true): Viewfinder | null {
  const [instance, setInstance] = useState<Viewfinder | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const sources = options.sources;
  // A new sources array rebuilds the overlay; other options are read when it is built.
  // biome-ignore lint/correctness/useExhaustiveDependencies: sources identity is the rebuild signal
  useEffect(() => {
    if (!enabled) return;
    const created = createViewfinder(latest.current);
    setInstance(created);
    return () => {
      created.destroy();
      setInstance(null);
    };
  }, [enabled, sources]);
  return instance;
}
