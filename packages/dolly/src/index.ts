// @quartifex/dolly (L07, 3D / R3F). A scroll camera rig: keyframes and splines from JSON,
// easing per segment, chapter-aware, damped, with portrait field-of-view compensation from
// safeframe. Framework-neutral core; three.js in ./three, React Three Fiber in ./react.
// Blender paths come from exporters/blender/dolly_export.py.
import { compensatedFov } from "@quartifex/safeframe";
import { catmullRom, damp, type Ease, ease, lerp, lerp3, type Vec3 } from "./math.js";

export { catmullRom, damp, type Ease, ease, lerp, type Vec3 } from "./math.js";

export type Key = {
  /** Scroll progress of this key, 0 to 1. Keys must be in order. */
  at: number;
  position: Vec3;
  /** Where the camera looks. */
  target: Vec3;
  /** Vertical field of view in degrees, as designed for landscape. */
  fov?: number;
  /** Ease of the segment that starts at this key. */
  ease?: Ease;
  /** Chapter that starts at this key. */
  chapter?: string;
};

export type CameraPath = {
  version: 1;
  /** "catmullrom" (default) passes smoothly through every key; "linear" goes straight. */
  spline?: "catmullrom" | "linear";
  keys: Key[];
  /** Per-bucket overrides (safeframe bucket names): different keys, or a dolly-back factor. */
  buckets?: Partial<Record<string, { keys?: Key[]; distance?: number }>>;
};

export type CameraState = {
  position: Vec3;
  target: Vec3;
  fov: number;
  /** The chapter the progress is in. */
  chapter: string | undefined;
  /** Index of the segment (key i to key i + 1). */
  segment: number;
};

/** Validate a path (parsed JSON) and return it typed, or throw with the first problem. */
export function parsePath(raw: unknown): CameraPath {
  const fail = (why: string): never => {
    throw new Error(`dolly path: ${why}`);
  };
  if (typeof raw !== "object" || raw === null) return fail("expected an object");
  const path = raw as Partial<CameraPath>;
  if (path.version !== 1) fail(`unsupported version ${String(path.version)}`);
  const checkKeys = (keys: unknown, where: string) => {
    if (!Array.isArray(keys) || keys.length < 2) return fail(`${where}: at least two keys needed`);
    let previous = -1;
    for (const [i, key] of keys.entries()) {
      const k = key as Partial<Key>;
      const vec = (v: unknown) =>
        Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n));
      if (typeof k.at !== "number" || k.at < 0 || k.at > 1)
        fail(`${where} key ${i}: "at" must be 0 to 1`);
      if ((k.at as number) < previous) fail(`${where} key ${i}: keys must be in order`);
      previous = k.at as number;
      if (!vec(k.position) || !vec(k.target))
        fail(`${where} key ${i}: position and target are [x, y, z]`);
    }
  };
  checkKeys(path.keys, "keys");
  for (const [name, bucket] of Object.entries(path.buckets ?? {})) {
    if (bucket?.keys) checkKeys(bucket.keys, `buckets.${name}`);
  }
  return path as CameraPath;
}

/** The camera at `progress`, before damping. Pure. */
export function sample(path: CameraPath, progress: number, bucket?: string): CameraState {
  const override = bucket ? path.buckets?.[bucket] : undefined;
  const keys = override?.keys ?? path.keys;
  const p = Math.min(Math.max(progress, 0), 1);
  let i = 0;
  while (i < keys.length - 2 && p >= (keys[i + 1] as Key).at) i++;
  const a = keys[i] as Key;
  const b = keys[i + 1] as Key;
  const local = b.at === a.at ? 1 : (p - a.at) / (b.at - a.at);
  const t = ease(a.ease, Math.min(Math.max(local, 0), 1));

  let position: Vec3;
  let target: Vec3;
  if ((path.spline ?? "catmullrom") === "catmullrom" && keys.length > 2) {
    // Spline parameter: key i sits at i / (n - 1).
    const u = (i + t) / (keys.length - 1);
    position = catmullRom(
      keys.map((k) => k.position),
      u,
    );
    target = catmullRom(
      keys.map((k) => k.target),
      u,
    );
  } else {
    position = lerp3(a.position, b.position, t);
    target = lerp3(a.target, b.target, t);
  }
  const distance = override?.distance ?? 1;
  if (distance !== 1) position = lerp3(target, position, distance);

  let chapter: string | undefined;
  for (const key of keys) if (key.at <= p + 1e-9 && key.chapter) chapter = key.chapter;
  return { position, target, fov: lerp(a.fov ?? 35, b.fov ?? 35, t), chapter, segment: i };
}

/** Chapters and the progress where each starts, in order. */
export function chapters(path: CameraPath): Array<{ name: string; at: number }> {
  return path.keys.filter((k) => k.chapter).map((k) => ({ name: k.chapter as string, at: k.at }));
}

export type RigOptions = {
  /** Damping strength (higher is snappier). 0 or reduced motion: no damping. Default 4. */
  damping?: number;
  /**
   * Under reduced motion the camera holds each chapter's key pose instead of travelling
   * along the path. Default: the visitor's `prefers-reduced-motion`.
   */
  reducedMotion?: boolean;
  /** Widen the FOV on portrait screens instead of pulling back (safeframe's rule). Default true. */
  compensate?: boolean;
};

export type Rig = {
  /** The damped camera after moving `dt` seconds towards `progress`, at `aspect` (width / height). */
  update(progress: number, dt: number, aspect: number, bucket?: string): CameraState;
  /** Jump straight to `progress` (no damping), e.g. after a chapter jump. */
  snap(progress: number, aspect: number, bucket?: string): CameraState;
  readonly state: CameraState;
  setReducedMotion(on: boolean): void;
};

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A damped rig over a path. Call `update` once per frame. */
export function createRig(path: CameraPath, options: RigOptions = {}): Rig {
  const lambda = options.damping ?? 4;
  let reduced = options.reducedMotion ?? prefersReducedMotion();
  const keyed = (progress: number, bucket?: string) => {
    if (!reduced) return progress;
    // Hold the pose of the chapter (or key) the progress is in.
    const keys = (bucket ? path.buckets?.[bucket]?.keys : undefined) ?? path.keys;
    let at = keys[0]?.at ?? 0;
    for (const key of keys)
      if (key.at <= progress + 1e-9 && (key.chapter || key === keys[0])) at = key.at;
    return at;
  };
  const withFov = (s: CameraState, aspect: number): CameraState =>
    options.compensate === false ? s : { ...s, fov: compensatedFov(s.fov, aspect) };

  let state = withFov(sample(path, 0), 16 / 9);
  return {
    update(progress, dt, aspect, bucket) {
      const goal = withFov(sample(path, keyed(progress, bucket), bucket), aspect);
      if (reduced || lambda <= 0) {
        state = goal;
        return state;
      }
      const d = (a: number, b: number) => damp(a, b, lambda, dt);
      state = {
        position: [
          d(state.position[0], goal.position[0]),
          d(state.position[1], goal.position[1]),
          d(state.position[2], goal.position[2]),
        ],
        target: [
          d(state.target[0], goal.target[0]),
          d(state.target[1], goal.target[1]),
          d(state.target[2], goal.target[2]),
        ],
        fov: d(state.fov, goal.fov),
        chapter: goal.chapter,
        segment: goal.segment,
      };
      return state;
    },
    snap(progress, aspect, bucket) {
      state = withFov(sample(path, keyed(progress, bucket), bucket), aspect);
      return state;
    },
    get state() {
      return state;
    },
    setReducedMotion(on) {
      reduced = on;
    },
  };
}
