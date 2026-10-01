// @quartifex/resolve (L29, Responsive scenes). A resolution ladder as data: from CSS
// pixels, device pixel ratio, GPU tier and connection it picks the sequence tier, the
// canvas pixel ratio, the texture size and the shadow-map size, and says why for each.
// It stops a 390 px phone at DPR 3 from downloading 2560 px frames.
// Framework-neutral; React in ./react, GPU detection (detect-gpu, optional) in ./gpu.
import type { Manifest } from "@quartifex/rushes/manifest";

export type GpuTier = 0 | 1 | 2 | 3;
export type EffectiveType = "slow-2g" | "2g" | "3g" | "4g";

export type Environment = {
  /** Viewport, CSS pixels. */
  width: number;
  height: number;
  dpr: number;
  /** detect-gpu's tier: 0 (blocklisted or very weak) to 3. Unknown is treated as 2. */
  gpuTier?: GpuTier;
  effectiveType?: EffectiveType;
  saveData?: boolean;
};

export type LadderTier = { name: string; width: number };

export type Target = {
  /** Available tiers, smallest first (e.g. from a rushes manifest). */
  tiers: LadderTier[];
  /** Source width / height. Default 16 / 9. */
  aspect?: number;
  /** How the sequence is drawn into its box. Default "cover". */
  fit?: "cover" | "contain";
  /** The box it is drawn into, CSS pixels. Default: the viewport. */
  box?: { width: number; height: number };
};

export type NetworkRule = {
  /** Highest tier index allowed (0 is the smallest). */
  maxTier?: number;
  /** Tiers to step down from the one the screen needs. */
  tierDrop?: number;
  maxDpr?: number;
};

/** The rules, as plain JSON. Override any part with `defineRules`. */
export type Rules = {
  /** Highest pixel ratio per GPU tier 0 to 3. */
  maxDpr: [number, number, number, number];
  /** A tier at least this share of the needed width is good enough (avoids jumping a tier for a few pixels). */
  tolerance: number;
  network: Partial<Record<EffectiveType, NetworkRule>>;
  saveData: { tierDrop: number; maxDpr: number; scale: number };
  texture: { sizes: number[]; maxByGpu: [number, number, number, number] };
  /** Shadow-map size per GPU tier; 0 turns shadows off. */
  shadowMap: [number, number, number, number];
};

export const DEFAULT_RULES: Rules = {
  maxDpr: [1, 1.5, 2, 3],
  tolerance: 0.9,
  network: {
    "slow-2g": { maxTier: 0, maxDpr: 1 },
    "2g": { maxTier: 0, maxDpr: 1 },
    "3g": { tierDrop: 1, maxDpr: 1.5 },
  },
  saveData: { tierDrop: 1, maxDpr: 1, scale: 0.5 },
  texture: { sizes: [512, 1024, 2048, 4096], maxByGpu: [1024, 2048, 4096, 4096] },
  shadowMap: [0, 1024, 2048, 2048],
};

/** Merge overrides into the defaults. */
export function defineRules(overrides: Partial<Rules> = {}): Rules {
  return {
    ...DEFAULT_RULES,
    ...overrides,
    network: { ...DEFAULT_RULES.network, ...overrides.network },
    saveData: { ...DEFAULT_RULES.saveData, ...overrides.saveData },
    texture: { ...DEFAULT_RULES.texture, ...overrides.texture },
  };
}

export type Decision = {
  tier: LadderTier & { index: number };
  /** Pixel ratio to give the canvas. */
  dpr: number;
  /** Device pixels the sequence covers horizontally at that ratio. */
  needed: number;
  texture: number;
  /** 0 means shadows off. */
  shadowMap: number;
  reasons: { dpr: string[]; tier: string[]; texture: string[]; shadowMap: string[] };
};

const round = (n: number) => Math.round(n * 100) / 100;

/** Decide. Pure: the same inputs always give the same answer and the same reasons. */
export function decide(env: Environment, target: Target, rules: Rules = DEFAULT_RULES): Decision {
  if (target.tiers.length === 0) throw new Error("resolve: no tiers to choose from");
  const reasons: Decision["reasons"] = { dpr: [], tier: [], texture: [], shadowMap: [] };
  const gpu: GpuTier = env.gpuTier ?? 2;
  const gpuKnown = env.gpuTier !== undefined;
  const net = env.effectiveType ? rules.network[env.effectiveType] : undefined;

  // Pixel ratio.
  let dpr = env.dpr;
  reasons.dpr.push(`device pixel ratio ${round(env.dpr)}`);
  const gpuCap = rules.maxDpr[gpu];
  if (dpr > gpuCap) {
    dpr = gpuCap;
    reasons.dpr.push(
      `capped at ${gpuCap} for GPU tier ${gpu}${gpuKnown ? "" : " (unknown, assumed)"}`,
    );
  }
  if (net?.maxDpr !== undefined && dpr > net.maxDpr) {
    dpr = net.maxDpr;
    reasons.dpr.push(`capped at ${net.maxDpr} on ${env.effectiveType}`);
  }
  if (env.saveData && dpr > rules.saveData.maxDpr) {
    dpr = rules.saveData.maxDpr;
    reasons.dpr.push(`capped at ${rules.saveData.maxDpr} because Save-Data is on`);
  }

  // Sequence tier: the device pixels the frames actually cover.
  const aspect = target.aspect ?? 16 / 9;
  const box = target.box ?? { width: env.width, height: env.height };
  const fit = target.fit ?? "cover";
  const drawn =
    fit === "cover"
      ? Math.max(box.width, box.height * aspect)
      : Math.min(box.width, box.height * aspect);
  const needed = Math.ceil(drawn * dpr);
  reasons.tier.push(
    `${fit} into ${Math.round(box.width)} x ${Math.round(box.height)} CSS px draws ${Math.round(drawn)} px wide, ${needed} device px at ${round(dpr)}x`,
  );
  const tiers = target.tiers;
  let index = tiers.findIndex((t) => t.width >= needed * rules.tolerance);
  if (index < 0) {
    index = tiers.length - 1;
    reasons.tier.push(
      `the largest tier (${tiers[index]?.width} px) is below that: frames will be upscaled`,
    );
  } else {
    reasons.tier.push(
      `smallest tier that covers it: ${tiers[index]?.name} (${tiers[index]?.width} px)`,
    );
  }
  if (net?.maxTier !== undefined && index > net.maxTier) {
    index = Math.max(0, net.maxTier);
    reasons.tier.push(`limited to ${tiers[index]?.name} on ${env.effectiveType}`);
  }
  if (net?.tierDrop && index > 0) {
    index = Math.max(0, index - net.tierDrop);
    reasons.tier.push(`stepped down to ${tiers[index]?.name} on ${env.effectiveType}`);
  }
  if (env.saveData && index > 0) {
    index = Math.max(0, index - rules.saveData.tierDrop);
    reasons.tier.push(`stepped down to ${tiers[index]?.name} because Save-Data is on`);
  }
  const chosen = tiers[index] as LadderTier;

  // Texture size: the next power of two that covers the needed width, within the GPU's limit.
  const sizes = [...rules.texture.sizes].sort((a, b) => a - b);
  const maxTexture = rules.texture.maxByGpu[gpu];
  let texture = sizes.find((s) => s >= needed) ?? (sizes[sizes.length - 1] as number);
  reasons.texture.push(`${texture} covers ${needed} device px`);
  if (texture > maxTexture) {
    texture = maxTexture;
    reasons.texture.push(`capped at ${maxTexture} for GPU tier ${gpu}`);
  }
  if (env.saveData) {
    const smaller = Math.max(sizes[0] as number, texture * rules.saveData.scale);
    if (smaller < texture) reasons.texture.push(`halved to ${smaller} because Save-Data is on`);
    texture = smaller;
  }

  // Shadow map.
  let shadowMap = rules.shadowMap[gpu];
  reasons.shadowMap.push(
    shadowMap ? `${shadowMap} for GPU tier ${gpu}` : `off for GPU tier ${gpu}`,
  );
  if (env.saveData && shadowMap) {
    shadowMap = Math.max(256, shadowMap * rules.saveData.scale);
    reasons.shadowMap.push(`reduced to ${shadowMap} because Save-Data is on`);
  }

  return { tier: { ...chosen, index }, dpr: round(dpr), needed, texture, shadowMap, reasons };
}

/** Every decision with its reasons, one per line, for logs and debug panels. */
export function explain(decision: Decision): string {
  const r = decision.reasons;
  return [
    `tier ${decision.tier.name}: ${r.tier.join("; ")}`,
    `dpr ${decision.dpr}: ${r.dpr.join("; ")}`,
    `texture ${decision.texture}: ${r.texture.join("; ")}`,
    `shadow map ${decision.shadowMap || "off"}: ${r.shadowMap.join("; ")}`,
  ].join("\n");
}

/** The tiers and aspect of a rushes manifest, ready for `decide`. */
export function targetFromManifest(
  manifest: Manifest,
  options: Omit<Target, "tiers" | "aspect"> = {},
): Target {
  return {
    ...options,
    tiers: manifest.tiers.map((t) => ({ name: t.name, width: t.width })),
    aspect: manifest.source.width / manifest.source.height,
  };
}

type ConnectionLike = { effectiveType?: string; saveData?: boolean };

/** Read the current browser environment. GPU tier comes from ./gpu, or pass it in. */
export function readEnvironment(gpuTier?: GpuTier, win: Window = window): Environment {
  const connection = (win.navigator as Navigator & { connection?: ConnectionLike }).connection;
  const type = connection?.effectiveType;
  const reducedData = win.matchMedia?.("(prefers-reduced-data: reduce)").matches ?? false;
  return {
    width: win.innerWidth,
    height: win.innerHeight,
    dpr: win.devicePixelRatio || 1,
    ...(gpuTier === undefined ? {} : { gpuTier }),
    ...(type === "slow-2g" || type === "2g" || type === "3g" || type === "4g"
      ? { effectiveType: type }
      : {}),
    ...(connection?.saveData || reducedData ? { saveData: true } : {}),
  };
}
