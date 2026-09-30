// Camera staging for 3D scenes: fit a perspective camera to a subject's bounding box
// for any aspect, with field-of-view compensation for portrait screens. Pure maths on
// plain {x, y, z} objects, so three.js Box3 and Vector3 work as they are.

export type Vec3 = { x: number; y: number; z: number };
export type Bounds = { min: Vec3; max: Vec3 };

export type CameraVariant = {
  /** Direction from the subject towards the camera. Default: straight on, { 0, 0, 1 }. */
  direction?: Vec3;
  /** Margin around the subject, as a fraction of the frame. Default 0.1. */
  padding?: number;
  /** Vertical field of view in degrees, as designed for a landscape screen. Default 35. */
  fov?: number;
};

export type FitOptions = CameraVariant & {
  /** Viewport width / height. */
  aspect: number;
  /**
   * On portrait screens, widen the vertical field of view so the horizontal one stays
   * as designed, instead of pulling the camera far back (which flattens the subject).
   * Default true.
   */
  compensate?: boolean;
  /** Upper bound for the compensated vertical field of view. Default 75. */
  maxFov?: number;
};

export type CameraFit = {
  position: Vec3;
  target: Vec3;
  /** Vertical field of view in degrees, after compensation. */
  fov: number;
  distance: number;
  near: number;
  far: number;
};

const DEG = Math.PI / 180;
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
};

/** The vertical field of view to use at `aspect`, after portrait compensation. */
export function compensatedFov(fov: number, aspect: number, maxFov = 75): number {
  if (aspect >= 1) return fov;
  const horizontalAtSquare = Math.tan((fov * DEG) / 2);
  return Math.min(maxFov, (2 * Math.atan(horizontalAtSquare / aspect)) / DEG);
}

/**
 * Where to put a perspective camera so `bounds` fills the frame with `padding` to spare,
 * seen from `direction`. Exact for boxes: every corner is checked against both the
 * vertical and the horizontal field of view.
 */
export function fitCamera(bounds: Bounds, options: FitOptions): CameraFit {
  const { aspect } = options;
  const padding = options.padding ?? 0.1;
  const baseFov = options.fov ?? 35;
  const fov =
    options.compensate === false ? baseFov : compensatedFov(baseFov, aspect, options.maxFov);

  const target: Vec3 = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
  const back = normalize(options.direction ?? { x: 0, y: 0, z: 1 });
  const worldUp = Math.abs(back.y) > 0.999 ? { x: 0, y: 0, z: -1 } : { x: 0, y: 1, z: 0 };
  const right = normalize(cross(worldUp, back));
  const up = cross(back, right);

  const scale = 1 / Math.max(1 - 2 * padding, 0.05);
  const tanV = Math.tan((fov * DEG) / 2) / scale;
  const tanH = (Math.tan((fov * DEG) / 2) * aspect) / scale;

  let distance = 0;
  let depth = 0;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const corner = sub({ x, y, z }, target);
        const along = dot(corner, back);
        distance = Math.max(
          distance,
          along + Math.abs(dot(corner, right)) / tanH,
          along + Math.abs(dot(corner, up)) / tanV,
        );
        depth = Math.max(depth, Math.abs(along));
      }
    }
  }

  return {
    position: {
      x: target.x + back.x * distance,
      y: target.y + back.y * distance,
      z: target.z + back.z * distance,
    },
    target,
    fov,
    distance,
    near: Math.max(distance - depth * 2, distance / 100),
    far: distance + depth * 4,
  };
}

/** A camera variant pinned to a scroll progress (0 to 1). */
export type CameraKey = CameraVariant & { at: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Interpolate a bucket's camera keyframes at `progress`. Keys must be sorted by `at`. */
export function sampleCamera(keys: readonly CameraKey[], progress: number): CameraVariant {
  const first = keys[0];
  if (!first) return {};
  let a: CameraKey = first;
  let b: CameraKey = first;
  for (const key of keys) {
    if (key.at <= progress) a = key;
    if (key.at >= progress) {
      b = key;
      break;
    }
    b = key;
  }
  const t = b.at === a.at ? 0 : Math.min(Math.max((progress - a.at) / (b.at - a.at), 0), 1);
  const dirA = normalize(a.direction ?? { x: 0, y: 0, z: 1 });
  const dirB = normalize(b.direction ?? { x: 0, y: 0, z: 1 });
  return {
    direction: normalize({
      x: lerp(dirA.x, dirB.x, t),
      y: lerp(dirA.y, dirB.y, t),
      z: lerp(dirA.z, dirB.z, t),
    }),
    padding: lerp(a.padding ?? 0.1, b.padding ?? 0.1, t),
    fov: lerp(a.fov ?? 35, b.fov ?? 35, t),
  };
}

/** The parts of a three.js PerspectiveCamera `applyCamera` sets. */
export type PerspectiveCameraLike = {
  fov: number;
  near: number;
  far: number;
  position: { set(x: number, y: number, z: number): unknown };
  lookAt(x: number, y: number, z: number): void;
  updateProjectionMatrix(): void;
};

/** Apply a fit to a three.js (or R3F) PerspectiveCamera. */
export function applyCamera(camera: PerspectiveCameraLike, fit: CameraFit): void {
  camera.fov = fit.fov;
  camera.near = fit.near;
  camera.far = fit.far;
  camera.position.set(fit.position.x, fit.position.y, fit.position.z);
  camera.lookAt(fit.target.x, fit.target.y, fit.target.z);
  camera.updateProjectionMatrix();
}
