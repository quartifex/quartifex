// The camera's script. Coordinates are the car's, in metres: nose towards -Z, the driver on the
// left (-X), wheels on y = 0; the car is 4.88 m long and 1.66 m tall.
// Each chapter has a start and an end pose; scroll moves the camera between them, and the
// render loop eases towards wherever scroll says it should be.
import type { SeatId } from "@/demo/system";

export type V3 = [number, number, number];
export type Pose = { pos: V3; target: V3; fov: number };

export type Chapter = {
  id: string;
  from: Pose;
  to: Pose;
  /** A point the camera bends through on the way (a curve, not a straight line). */
  via?: V3;
  /** Inside the cabin (the glass turns see-through, the cabin light comes up). */
  inside?: boolean;
};

const P = (pos: V3, target: V3, fov: number): Pose => ({ pos, target, fov });

/** The surfaces AVENUE draws on. Three are the car's own (the driver display behind the wheel,
 *  the portrait centre display, the head-up display); the two rear screens are AVENUE's
 *  addition, mounted on the backs of the front headrests. */
export type SurfaceId = "cluster" | "centre" | "hud" | "rearLeft" | "rearRight";
export const SURFACE_IDS: SurfaceId[] = ["cluster", "centre", "hud", "rearLeft", "rearRight"];

export type Surface = {
  /** Middle of the glass, metres. */
  center: V3;
  /** The way the glass faces (towards its viewer). */
  normal: V3;
  /** Width and height of the glass, metres. */
  size: [number, number];
  /** Canvas pixels for the drawing. */
  px: [number, number];
  name: string;
};

/** Measured from the model: the planes fitted to its own screen glass and headrests. */
export const SURFACES: Record<SurfaceId, Surface> = {
  cluster: {
    name: "Driver display",
    center: [-0.358, 1.115, -0.514],
    normal: [0, 0.257, 0.966],
    size: [0.222, 0.0767],
    px: [1160, 400],
  },
  centre: {
    name: "Centre display",
    center: [0.005, 1.035, -0.486],
    normal: [-0.045, 0.342, 0.939],
    size: [0.202, 0.316],
    px: [860, 1344],
  },
  // A virtual image, as a head-up display shows it: floating over the bonnet in the driver's
  // line of sight.
  hud: {
    name: "Head-up display",
    center: [-0.37, 1.17, -1.55],
    normal: [0.008, 0.06, 1],
    size: [0.46, 0.15],
    px: [1104, 360],
  },
  rearLeft: {
    name: "Rear left screen",
    center: [-0.363, 1.33, 0.448],
    normal: [0, 0.17, 0.985],
    size: [0.192, 0.12],
    px: [1280, 800],
  },
  rearRight: {
    name: "Rear right screen",
    center: [0.363, 1.33, 0.448],
    normal: [0, 0.17, 0.985],
    size: [0.192, 0.12],
    px: [1280, 800],
  },
};

/** Which surface a seat works on: the front seats share the centre display. */
export const SEAT_SURFACE: Record<SeatId, SurfaceId> = {
  driver: "centre",
  copilot: "centre",
  rearLeft: "rearLeft",
  rearRight: "rearRight",
};

/** Where each seat's occupant looks from. */
export const EYES: Record<SeatId, V3> = {
  driver: [-0.36, 1.25, 0.2],
  copilot: [0.36, 1.25, 0.2],
  rearLeft: [-0.36, 1.2, 1.12],
  rearRight: [0.36, 1.2, 1.12],
};

/** The demo's view for a seat: just behind its occupant's eyes, on its screen. */
export function seatPose(seat: SeatId): Pose {
  const [ex, ey, ez] = EYES[seat];
  const [sx, sy, sz] = SURFACES[SEAT_SURFACE[seat]].center;
  const front = seat === "driver" || seat === "copilot";
  return P(
    [ex * 0.8 + sx * 0.2, ey + 0.02, ez - (front ? 0.05 : 0.18)],
    [sx, sy, sz],
    front ? 40 : 38,
  );
}

// The opening is one unbroken move: each chapter starts where the last one ends.
const HERO_FROM = P([-7.9, 1.25, -7.5], [1.25, 0.66, -1.35], 24);
const HERO_END = P([-9.2, 1.45, -3.9], [0.85, 0.7, -1.75], 25);
const DOOR = P([-2.75, 1.3, 0.25], [-0.25, 1.05, -0.55], 38);
const SEATED = P([-0.36, 1.25, 0.24], [-0.24, 1.07, -0.62], 50);
const CLUSTER = P([-0.32, 1.25, 0.14], [-0.62, 1.15, -0.9], 42);
const CENTRE = P([-0.12, 1.23, 0.06], [0.16, 1.03, -0.49], 42);
const REAR_FROM = P([0, 1.46, 1.22], [0, 1.12, 0.3], 58);
const REAR_TO = P([0.04, 1.4, 1.12], [0, 1.08, 0.3], 56);

export const CHAPTERS: Chapter[] = [
  // 00 The studio: the car's front three-quarter, turning slowly to its side.
  { id: "hero", from: HERO_FROM, to: HERO_END },
  // 01 The car as it is: round to the driver's door, which opens.
  { id: "enter", from: HERO_END, via: [-6.2, 1.25, 0.6], to: DOOR },
  // 02 Into the driver's seat: through the open door, the screens waking one by one.
  { id: "cabin", from: DOOR, via: [-1.2, 1.3, 0.35], to: SEATED, inside: true },
  // 03 The driver display and the head-up display.
  { id: "driver", from: SEATED, to: CLUSTER, inside: true },
  // 04 The centre display.
  { id: "centre", from: CLUSTER, via: [-0.3, 1.24, 0.1], to: CENTRE, inside: true },
  // 05 Turning round: the rear seats and their screens.
  { id: "rear", from: REAR_FROM, to: REAR_TO, inside: true },
  // D The live demo: settling on the driver's view of the centre display.
  {
    id: "demo",
    from: P([0, 1.3, 0.9], [-0.1, 1.08, -0.4], 56),
    to: seatPose("driver"),
    inside: true,
  },
];

export const CHAPTER_BY_ID: Record<string, Chapter> = Object.fromEntries(
  CHAPTERS.map((c) => [c.id, c]),
);

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** The pose for a chapter at a progress through it (0 to 1), eased in and out. */
export function poseAt(chapter: Chapter, t: number): Pose {
  const k = ease(Math.min(1, Math.max(0, t)));
  const lerp = (a: number, b: number) => a + (b - a) * k;
  const l3 = (a: V3, b: V3): V3 => [lerp(a[0], b[0]), lerp(a[1], b[1]), lerp(a[2], b[2])];
  const { via } = chapter;
  const bend = (i: 0 | 1 | 2) => {
    const a = chapter.from.pos[i];
    const c = chapter.to.pos[i];
    const v = via?.[i] ?? (a + c) / 2;
    return (1 - k) * (1 - k) * a + 2 * (1 - k) * k * v + k * k * c;
  };
  return {
    pos: via ? [bend(0), bend(1), bend(2)] : l3(chapter.from.pos, chapter.to.pos),
    target: l3(chapter.from.target, chapter.to.target),
    fov: lerp(chapter.from.fov, chapter.to.fov),
  };
}
