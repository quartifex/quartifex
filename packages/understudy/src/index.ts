// @quartifex/understudy (L12, Quality & testing). A quality governor with a contract:
// WebGL, then the image sequence, then the poster. It picks the starting rung and quality
// from the device (WebGL support, GPU tier, Save-Data, reduced motion), then watches the
// frame rate: it steps quality down (post-processing, pixel ratio, shadows, particles) when
// frames run slow, back up with hysteresis when they recover, and hands off to the next
// rung when the lowest WebGL quality still cannot keep up or the context is lost. It never
// climbs back to WebGL on its own. Framework-neutral; React in ./react, React Three Fiber in
// ./r3f, the hand-off to reel in ./reel.

export type Rung = "webgl" | "sequence" | "poster";
export const RUNGS: readonly Rung[] = ["webgl", "sequence", "poster"];

/** What the WebGL scene should render at. */
export type Quality = {
  /** Canvas pixel ratio. */
  dpr: number;
  shadows: boolean;
  /** Post-processing passes. */
  post: boolean;
  /** Fraction of particles (or other instanced detail) to draw, 0 to 1. */
  particles: number;
};

/** One step down the quality ladder: what changes from the step above. */
export type Step = Partial<Quality> & { name: string };

export type Environment = {
  webgl: boolean;
  /** WebGL only through software rendering (failIfMajorPerformanceCaveat). */
  majorPerformanceCaveat?: boolean;
  /** detect-gpu's tier, e.g. from `@quartifex/understudy/gpu`. */
  gpuTier?: 0 | 1 | 2 | 3;
  reducedMotion?: boolean;
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  devicePixelRatio?: number;
};

export type Contract = {
  /** The rungs this scene ships, best first. Default all three. */
  rungs?: readonly Rung[];
  /** The quality ladder, best first. Default `defaultSteps(maxDpr)`. */
  steps?: readonly Step[];
  /** Highest pixel ratio. Default the device's, capped at 2. */
  maxDpr?: number;
  /** Starting step by GPU tier (index into `steps`); unknown tier uses `unknown`. */
  start?: { 0?: number; 1?: number; 2?: number; 3?: number; unknown?: number };
  fps?: {
    /** Window length in ms. Default 1000. */
    window?: number;
    /** Below this fraction of the refresh rate a window counts as slow. Default 0.75. */
    low?: number;
    /** Above this fraction a window counts as smooth. Default 0.95. */
    high?: number;
    /** Slow windows in a row before a step down. Default 2. */
    patience?: number;
    /** Smooth windows in a row before a step up. Default 5. */
    recover?: number;
    /** Steps back up allowed after a step down, so quality cannot flap. Default 2. */
    maxRecoveries?: number;
    /** Windows ignored after start, a rung change or a hitch. Default 1. */
    warmup?: number;
    /** Frames slower than this (tab asleep, a stall) are dropped, not counted. Default 250 ms. */
    hitch?: number;
    /**
     * The display's refresh rate, if you know it. Otherwise it is estimated from the fastest
     * frames, never below `minRefresh` (default 60): a scene stuck at 25 fps cannot tell a
     * 60 Hz screen from a 30 Hz one, and 30 Hz screens are rare.
     */
    refresh?: number;
    minRefresh?: number;
  };
  /** Slow windows at the lowest step before handing off to the next rung. Default 3. */
  demoteAfter?: number;
  /** Under reduced motion: "poster" (default), "sequence" (reel shows its poster too), or "keep". */
  reducedMotion?: "poster" | "sequence" | "keep";
  /** On Save-Data or 2G: "sequence" (default: it shows frames as they arrive), "poster" or "keep". */
  saveData?: "sequence" | "poster" | "keep";
};

export type State = {
  rung: Rung;
  /** Index into the steps. */
  step: number;
  stepName: string;
  quality: Quality;
  /** Frames per second in the last full window, or 0 before one. */
  fps: number;
  /** Estimated display refresh rate. */
  refresh: number;
  /** Why things changed, newest last. */
  reasons: string[];
};

export type Understudy = {
  readonly state: State;
  /** Call once per rendered frame with its duration in ms (R3F: `delta * 1000`). */
  frame(ms: number): void;
  /** Hand off to the next rung now, e.g. on context loss. */
  demote(reason: string): void;
  /** Go back to WebGL (a visitor's "try 3D again"); counters and recoveries reset. */
  retry(): void;
  setReducedMotion(on: boolean): void;
  subscribe(listener: (state: State) => void): () => void;
};

/** The default ladder: post-processing goes first, particles last. */
export function defaultSteps(maxDpr = 2): Step[] {
  return [
    { name: "Full", dpr: maxDpr, shadows: true, post: true, particles: 1 },
    { name: "No post-processing", post: false },
    { name: "Pixel ratio 1.5", dpr: Math.min(maxDpr, 1.5) },
    { name: "No shadows", shadows: false },
    { name: "Pixel ratio 1", dpr: Math.min(maxDpr, 1) },
    { name: "Half the particles", particles: 0.5 },
    { name: "Minimum", dpr: Math.min(maxDpr, 0.75), particles: 0.25 },
  ];
}

/** The quality at a step: every step down to it, applied in order. */
export function qualityAt(steps: readonly Step[], step: number): Quality {
  let q: Quality = { dpr: 1, shadows: true, post: true, particles: 1 };
  for (let i = 0; i <= Math.min(step, steps.length - 1); i++) {
    const { name: _name, ...change } = steps[i] ?? { name: "" };
    q = { ...q, ...change };
  }
  return q;
}

const START = { 0: 4, 1: 3, 2: 1, 3: 0, unknown: 1 };
const REFRESH_RATES = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240];

/** The next rung down that the contract ships, or null. */
function below(rung: Rung, rungs: readonly Rung[]): Rung | null {
  const at = RUNGS.indexOf(rung);
  return RUNGS.slice(at + 1).find((r) => rungs.includes(r)) ?? null;
}

/** The rung to start on, and why. */
export function chooseRung(
  env: Environment,
  contract: Contract = {},
): { rung: Rung; reasons: string[] } {
  const rungs = contract.rungs ?? RUNGS;
  const reasons: string[] = [];
  let want: Rung = "webgl";
  const lower = (to: Rung, reason: string) => {
    if (RUNGS.indexOf(to) > RUNGS.indexOf(want)) {
      want = to;
      reasons.push(reason);
    }
  };
  if (!env.webgl) lower("sequence", "WebGL is not available");
  else if (env.majorPerformanceCaveat) lower("sequence", "WebGL runs in software here");
  else if (env.gpuTier === 0) lower("sequence", "GPU tier 0: too slow for real-time 3D");
  const slow = env.saveData || env.effectiveType === "2g" || env.effectiveType === "slow-2g";
  const data = contract.saveData ?? "sequence";
  if (slow && data !== "keep") {
    lower(data, env.saveData ? "Save-Data is on" : "The connection is 2G");
  }
  const motion = contract.reducedMotion ?? "poster";
  if (env.reducedMotion && motion !== "keep") lower(motion, "Reduced motion is on");
  // Skip rungs the scene does not ship.
  let rung: Rung | null = want;
  while (rung && !rungs.includes(rung)) rung = below(rung, rungs);
  const fallback = rungs[rungs.length - 1] ?? "poster";
  return { rung: rung ?? fallback, reasons: reasons.length ? reasons : ["WebGL is available"] };
}

const snap = (hz: number) =>
  REFRESH_RATES.reduce((best, r) => (Math.abs(r - hz) < Math.abs(best - hz) ? r : best), 60);

/** Create a governor for a scene. `env` from `readEnvironment()` in a browser. */
export function createUnderstudy(env: Environment, contract: Contract = {}): Understudy {
  const rungs = contract.rungs ?? RUNGS;
  const maxDpr = contract.maxDpr ?? Math.min(env.devicePixelRatio ?? 1, 2);
  const steps = contract.steps ?? defaultSteps(maxDpr);
  const last = steps.length - 1;
  const fps = contract.fps ?? {};
  const windowMs = fps.window ?? 1000;
  const low = fps.low ?? 0.75;
  const high = fps.high ?? 0.95;
  const patience = fps.patience ?? 2;
  const recover = fps.recover ?? 5;
  const maxRecoveries = fps.maxRecoveries ?? 2;
  const warmupWindows = fps.warmup ?? 1;
  const hitch = fps.hitch ?? 250;
  const minRefresh = fps.minRefresh ?? 60;
  const demoteAfter = contract.demoteAfter ?? 3;
  const starts = { ...START, ...contract.start };
  const startStep = Math.min(
    last,
    env.gpuTier === undefined ? starts.unknown : (starts[env.gpuTier] ?? starts.unknown),
  );

  const listeners = new Set<(s: State) => void>();
  let reduced = Boolean(env.reducedMotion);
  // The lowest rung performance has pushed us to; preferences never lift us above it.
  let floor: Rung = "webgl";
  const initial = chooseRung(env, contract);
  let state: State = {
    rung: initial.rung,
    step: startStep,
    stepName: steps[startStep]?.name ?? "",
    quality: qualityAt(steps, startStep),
    fps: 0,
    refresh: 60,
    reasons: [
      ...initial.reasons,
      ...(initial.rung === "webgl"
        ? [
            `Starting at "${steps[startStep]?.name}"${env.gpuTier === undefined ? " (GPU tier unknown)" : ` for GPU tier ${env.gpuTier}`}`,
          ]
        : []),
    ],
  };

  let frames = 0;
  let elapsed = 0;
  let samples: number[] = [];
  let warmup = warmupWindows;
  let slow = 0;
  let smooth = 0;
  let slowAtBottom = 0;
  let recoveries = 0;
  let refreshSeen = 0;

  const emit = (patch: Partial<State>, reason?: string) => {
    state = {
      ...state,
      ...patch,
      reasons: reason ? [...state.reasons, reason].slice(-20) : state.reasons,
    };
    for (const l of listeners) l(state);
  };
  const resetWindow = () => {
    frames = 0;
    elapsed = 0;
    samples = [];
  };
  const resetCounters = () => {
    resetWindow();
    warmup = warmupWindows;
    slow = 0;
    smooth = 0;
    slowAtBottom = 0;
  };
  const setStep = (step: number, reason: string) => {
    emit({ step, stepName: steps[step]?.name ?? "", quality: qualityAt(steps, step) }, reason);
  };
  const lowerRung = (to: Rung | null, reason: string) => {
    if (!to) return;
    if (RUNGS.indexOf(to) > RUNGS.indexOf(floor)) floor = to;
    resetCounters();
    emit({ rung: to }, reason);
  };

  return {
    get state() {
      return state;
    },
    frame(ms) {
      if (state.rung !== "webgl") return;
      if (!(ms > 0) || ms > hitch) {
        // A stall or a sleeping tab says nothing about the scene: drop this window.
        resetWindow();
        return;
      }
      frames++;
      elapsed += ms;
      samples.push(ms);
      if (elapsed < windowMs) return;

      const measured = (frames * 1000) / elapsed;
      // Fast frames reveal the display's rate: the 10th percentile frame time.
      samples.sort((a, b) => a - b);
      const p10 = samples[Math.floor(samples.length * 0.1)] ?? ms;
      refreshSeen = fps.refresh ?? Math.max(refreshSeen, minRefresh, snap(1000 / p10));
      resetWindow();
      if (warmup > 0) {
        warmup--;
        emit({ fps: measured, refresh: refreshSeen });
        return;
      }
      const ratio = measured / refreshSeen;
      const rounded = Math.round(measured);
      state = { ...state, fps: measured, refresh: refreshSeen };
      if (ratio < low) {
        smooth = 0;
        if (state.step === last) {
          slowAtBottom++;
          if (slowAtBottom >= demoteAfter) {
            const to = below("webgl", rungs);
            lowerRung(
              to,
              `Still ${rounded} fps at the lowest WebGL quality: handing off to the ${to === "sequence" ? "image sequence" : "poster"}`,
            );
            return;
          }
        } else if (++slow >= patience) {
          slow = 0;
          setStep(
            state.step + 1,
            `${rounded} fps of ${refreshSeen} Hz: "${steps[state.step + 1]?.name}"`,
          );
          warmup = warmupWindows;
          return;
        }
      } else if (ratio > high) {
        slow = 0;
        slowAtBottom = 0;
        if (++smooth >= recover && state.step > startStep && recoveries < maxRecoveries) {
          smooth = 0;
          recoveries++;
          setStep(
            state.step - 1,
            `${rounded} fps, steady: back up to "${steps[state.step - 1]?.name}"`,
          );
          warmup = warmupWindows;
          return;
        }
      } else {
        slow = 0;
        smooth = 0;
        slowAtBottom = 0;
      }
      emit({});
    },
    demote(reason) {
      lowerRung(below(state.rung, rungs), reason);
    },
    retry() {
      if (!rungs.includes("webgl") || !env.webgl) return;
      floor = "webgl";
      recoveries = 0;
      resetCounters();
      const rung =
        reduced && (contract.reducedMotion ?? "poster") !== "keep" ? state.rung : "webgl";
      emit(
        {
          rung,
          step: startStep,
          stepName: steps[startStep]?.name ?? "",
          quality: qualityAt(steps, startStep),
        },
        "Trying WebGL again",
      );
    },
    setReducedMotion(on) {
      if (on === reduced) return;
      reduced = on;
      const chosen = chooseRung({ ...env, reducedMotion: on }, contract).rung;
      const rung = RUNGS.indexOf(chosen) > RUNGS.indexOf(floor) ? chosen : floor;
      resetCounters();
      emit({ rung }, on ? "Reduced motion is on" : "Reduced motion is off");
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** WebGL support, and whether it would only run in software. Browser only. */
export function detectWebGL(
  doc: Document = document,
): Pick<Environment, "webgl" | "majorPerformanceCaveat"> {
  const canvas = doc.createElement("canvas");
  const strict = { failIfMajorPerformanceCaveat: true };
  const lose = (gl: RenderingContext | null) => {
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  };
  const fast = canvas.getContext("webgl2", strict) ?? canvas.getContext("webgl", strict);
  if (fast) {
    lose(fast);
    return { webgl: true, majorPerformanceCaveat: false };
  }
  const any =
    doc.createElement("canvas").getContext("webgl2") ??
    doc.createElement("canvas").getContext("webgl");
  lose(any);
  return { webgl: Boolean(any), majorPerformanceCaveat: Boolean(any) };
}

type Connection = { saveData?: boolean; effectiveType?: Environment["effectiveType"] };

/** The environment from this browser. Pass the GPU tier if you have one (it needs a fetch). */
export function readEnvironment(
  gpuTier?: Environment["gpuTier"],
  win: Window = window,
): Environment {
  const connection = (win.navigator as Navigator & { connection?: Connection }).connection;
  return {
    ...detectWebGL(win.document),
    ...(gpuTier === undefined ? {} : { gpuTier }),
    reducedMotion: win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    ...(connection?.saveData ? { saveData: true } : {}),
    ...(connection?.effectiveType ? { effectiveType: connection.effectiveType } : {}),
    devicePixelRatio: win.devicePixelRatio || 1,
  };
}

/** Demote when the canvas loses its WebGL context. Returns a function that stops watching. */
export function watchContext(canvas: HTMLCanvasElement, understudy: Understudy): () => void {
  const lost = (event: Event) => {
    event.preventDefault();
    understudy.demote("The WebGL context was lost");
  };
  canvas.addEventListener("webglcontextlost", lost);
  return () => canvas.removeEventListener("webglcontextlost", lost);
}
