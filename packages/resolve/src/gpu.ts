// GPU tier through detect-gpu, published as `@quartifex/resolve/gpu`. detect-gpu is an
// optional peer: without it, or if it fails, the tier is reported as unknown.
import type { GpuTier } from "./index.js";

type DetectGpu = { getGPUTier(options?: Record<string, unknown>): Promise<{ tier: number }> };

/** detect-gpu's tier (0 to 3), or undefined when it is not installed or cannot tell. */
export async function getGpuTier(
  options: Record<string, unknown> = {},
): Promise<GpuTier | undefined> {
  try {
    const name = "detect-gpu";
    const mod = (await import(/* @vite-ignore */ /* webpackIgnore: true */ name)) as DetectGpu;
    const { tier } = await mod.getGPUTier(options);
    return tier === 0 || tier === 1 || tier === 2 || tier === 3 ? tier : undefined;
  } catch {
    return undefined;
  }
}
