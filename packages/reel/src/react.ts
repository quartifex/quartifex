// React adapter for @quartifex/reel, published as `@quartifex/reel/react`.
import type { Manifest } from "@quartifex/rushes/manifest";
import { type RefObject, useEffect, useRef, useState } from "react";
import { createReel, type Reel, type ReelOptions } from "./index.js";

/**
 * Attach a reel to the canvas the returned ref points at. Recreated when the manifest,
 * base URL, tier, format or fit change. Drive it with `reel.seek(progress)`, or with
 * `bindScroll` / `scrubReel`.
 */
export function useReel(
  manifest: Manifest | null,
  options: ReelOptions,
): [RefObject<HTMLCanvasElement | null>, Reel | null] {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [reel, setReel] = useState<Reel | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const { baseUrl, tier, format, fit, decode } = options;

  // The listed options rebuild the reel; the rest are read from `latest` when it is built.
  // biome-ignore lint/correctness/useExhaustiveDependencies: these options change what reel loads
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !manifest) return;
    const instance = createReel(canvas, manifest, { ...latest.current, baseUrl });
    setReel(instance);
    return () => {
      instance.destroy();
      setReel(null);
    };
  }, [manifest, baseUrl, tier, format, fit, decode]);

  return [ref, reel];
}
