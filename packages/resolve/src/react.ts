// React adapter for @quartifex/resolve, published as `@quartifex/resolve/react`.
import { useEffect, useState } from "react";
import {
  type Decision,
  decide,
  type GpuTier,
  type Rules,
  readEnvironment,
  type Target,
} from "./index.js";

/**
 * The current decision, re-made when the window resizes or the connection changes.
 * Returns null during server rendering.
 */
export function useResolve(
  target: Target,
  options: { gpuTier?: GpuTier; rules?: Rules } = {},
): Decision | null {
  const [decision, setDecision] = useState<Decision | null>(null);
  const { gpuTier, rules } = options;
  useEffect(() => {
    const update = () => setDecision(decide(readEnvironment(gpuTier), target, rules));
    update();
    const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
    window.addEventListener("resize", update);
    connection?.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      connection?.removeEventListener("change", update);
    };
  }, [target, gpuTier, rules]);
  return decision;
}
