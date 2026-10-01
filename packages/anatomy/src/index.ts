// @quartifex/anatomy (L24, 3D / R3F). Exploded views from a model's hierarchy: each part's
// explosion vector comes from where it sits in the assembly (or from an override on the
// node), parts separate in a staggered order as progress runs 0 to 1, and labelled parts
// get annotations that appear once they are apart. Framework-neutral maths here; three.js
// in ./three, React Three Fiber (with drei annotations) in ./react.
import { type Ease, ease, type Vec3 } from "@quartifex/dolly";

export type { Vec3 } from "@quartifex/dolly";

export type Part = {
  id: string;
  /** Centre of the part's bounding box, in assembly space. */
  center: Vec3;
  /** 0 for direct children of the assembly, 1 for their children, and so on. */
  depth: number;
  /** Fixed explosion offset (assembly space) instead of the derived one, e.g. from `userData.explode`. */
  explode?: Vec3;
  label?: string;
};

export type ExplodeOptions = {
  /** "radial" pushes parts away from the assembly centre; "axis" spreads them along `axis`. Default "radial". */
  mode?: "radial" | "axis";
  /** Spread direction for "axis" mode. Default up, [0, 1, 0]. */
  axis?: Vec3;
  /** How far, as a multiple of the assembly radius. Default 1. */
  distance?: number;
  /**
   * 0: every part moves together. 1: one after another. Parts go in hierarchy order
   * (outer parts first). Default 0.5.
   */
  stagger?: number;
  /** Ease of each part's own move. Default "inOut". */
  ease?: Ease;
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const normalize = (a: Vec3): Vec3 => {
  const l = length(a);
  return l < 1e-9 ? [0, 0, 0] : scale(a, 1 / l);
};

/** Centre and radius of the assembly (the parts' centres). */
export function bounds(parts: readonly Part[]): { center: Vec3; radius: number } {
  if (parts.length === 0) return { center: [0, 0, 0], radius: 1 };
  const center = scale(
    parts.reduce<Vec3>(
      (acc, p) => [acc[0] + p.center[0], acc[1] + p.center[1], acc[2] + p.center[2]],
      [0, 0, 0],
    ),
    1 / parts.length,
  );
  const radius = Math.max(...parts.map((p) => length(sub(p.center, center))), 1e-3);
  return { center, radius };
}

/**
 * Each part's offset at full explosion, in assembly space. Nested parts move half as far
 * again per level, so a sub-assembly stays readable as a group.
 */
export function explosionVectors(
  parts: readonly Part[],
  options: ExplodeOptions = {},
): Map<string, Vec3> {
  const { center, radius } = bounds(parts);
  const distance = (options.distance ?? 1) * radius;
  const axis = normalize(options.axis ?? [0, 1, 0]);
  const vectors = new Map<string, Vec3>();
  const along = parts
    .map((p) => ({ id: p.id, d: dot(sub(p.center, center), axis) }))
    .sort((a, b) => a.d - b.d);

  for (const part of parts) {
    const falloff = 0.5 ** part.depth;
    if (part.explode) {
      vectors.set(part.id, scale(part.explode, options.distance ?? 1));
      continue;
    }
    let direction: Vec3;
    if ((options.mode ?? "radial") === "axis") {
      // Spread along the axis by order, centred on the middle part: even gaps, no overlaps.
      const rank = along.findIndex((a) => a.id === part.id);
      const middle = (along.length - 1) / 2;
      vectors.set(
        part.id,
        scale(axis, ((rank - middle) / Math.max(middle, 1)) * distance * falloff),
      );
      continue;
    } else {
      direction = normalize(sub(part.center, center));
      if (length(direction) === 0) direction = axis;
    }
    vectors.set(part.id, scale(direction, distance * falloff));
  }
  return vectors;
}

/** How far along its own move part `index` of `count` is at overall `progress`. */
export function partProgress(
  progress: number,
  index: number,
  count: number,
  stagger = 0.5,
  kind: Ease = "inOut",
): number {
  const p = Math.min(Math.max(progress, 0), 1);
  if (count <= 1 || stagger <= 0) return ease(kind, p);
  const s = Math.min(stagger, 1);
  // Each part's window has length w; starts are spread so the last one ends at 1.
  const w = 1 - s * (1 - 1 / count);
  const start = ((1 - w) * index) / (count - 1);
  return ease(kind, (p - start) / w);
}

/** Parts in move order: outer levels first, then by distance from the centre, outermost first. */
export function moveOrder(parts: readonly Part[]): Part[] {
  const { center } = bounds(parts);
  return [...parts].sort(
    (a, b) => a.depth - b.depth || length(sub(b.center, center)) - length(sub(a.center, center)),
  );
}

export type Exploded = {
  /** Offset of each part at this progress, in assembly space. */
  offsets: Map<string, Vec3>;
  /** Labelled parts, with their position and whether the label should show. */
  annotations: Array<{ id: string; label: string; position: Vec3; visible: boolean }>;
};

/** Offsets and annotations at `progress`. Pure. */
export function explode(
  parts: readonly Part[],
  progress: number,
  options: ExplodeOptions = {},
): Exploded {
  const vectors = explosionVectors(parts, options);
  const order = moveOrder(parts);
  const offsets = new Map<string, Vec3>();
  const annotations: Exploded["annotations"] = [];
  order.forEach((part, index) => {
    const t = partProgress(
      progress,
      index,
      order.length,
      options.stagger ?? 0.5,
      options.ease ?? "inOut",
    );
    const offset = scale(vectors.get(part.id) ?? [0, 0, 0], t);
    offsets.set(part.id, offset);
    if (part.label) {
      annotations.push({
        id: part.id,
        label: part.label,
        position: [
          part.center[0] + offset[0],
          part.center[1] + offset[1],
          part.center[2] + offset[2],
        ],
        visible: t >= 0.6,
      });
    }
  });
  return { offsets, annotations };
}
