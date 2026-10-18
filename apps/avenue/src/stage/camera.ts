// The camera's script. Coordinates are the demo car's, in metres: nose towards -Z, the driver
// on the left (-X, a left-hand-drive car), wheels on y = 0, the car 4.92 m long, 1.67 m tall.
// Each chapter has a start and an end pose; scroll moves the camera between them, and the
// render loop eases towards wherever scroll says it should be.
import type { SeatId } from "@/demo/system";

export type Pose = { pos: [number, number, number]; target: [number, number, number]; fov: number };

export type Chapter = {
  id: string;
  from: Pose;
  to: Pose;
  /** Inside the cabin (the glass turns see-through, the cabin light comes up). */
  inside?: boolean;
};

const P = (pos: Pose["pos"], target: Pose["target"], fov: number): Pose => ({ pos, target, fov });

/** The cabin screens: centre, size (w, h) in metres, the direction they face, and tilt. */
export const SCREENS: Record<
  SeatId,
  { center: [number, number, number]; size: [number, number]; yaw: number; tilt: number }
> = {
  // The driver's curved display: cluster and centre screen as one panel behind the wheel...
  driver: { center: [-0.3, 1.09, -0.752], size: [0.6, 0.135], yaw: 0, tilt: -0.42 },
  // ...and the co-pilot's own screen across the dash in front of them.
  copilot: { center: [0.36, 1.1, -0.612], size: [0.42, 0.12], yaw: 0, tilt: -0.38 },
  // The rear screens, in the backs of the front seats, facing the rear passengers.
  rearLeft: { center: [-0.36, 1.0, 0.258], size: [0.26, 0.16], yaw: Math.PI, tilt: -0.08 },
  rearRight: { center: [0.36, 1.0, 0.258], size: [0.26, 0.16], yaw: Math.PI, tilt: -0.08 },
};

/** Where each seat's occupant looks from. */
export const EYES: Record<SeatId, [number, number, number]> = {
  driver: [-0.38, 1.26, 0.12],
  copilot: [0.38, 1.26, 0.12],
  rearLeft: [-0.36, 1.24, 0.92],
  rearRight: [0.36, 1.24, 0.92],
};

/** The demo's view for a seat: just behind and above its occupant's eyes, on its screen. */
export function seatPose(seat: SeatId): Pose {
  const [ex, ey, ez] = EYES[seat];
  const [sx, sy, sz] = SCREENS[seat].center;
  const front = seat === "driver" || seat === "copilot";
  return P([ex * 0.92, ey + 0.04, ez + (front ? 0.12 : 0.08)], [sx, sy, sz], front ? 46 : 50);
}

export const CHAPTERS: Chapter[] = [
  // 00 Hero: the front three-quarter in the studio, the car to the right of the words,
  // drifting round towards the side.
  {
    id: "hero",
    from: P([-6.9, 1.15, -8.6], [1.05, 0.74, -1.25], 27),
    to: P([-7.7, 1.28, -7.8], [1.0, 0.74, -1.1], 27),
  },
  // 01 The problem: the long side, then along it towards the rear door.
  {
    id: "problem",
    from: P([-9.6, 1.4, 0.6], [0.6, 0.8, -1.6], 28),
    to: P([-6.8, 1.6, 5.4], [0.4, 0.95, -0.4], 30),
  },
  // 02 Into the cabin: up to the rear window, a blink, then inside behind the front seats.
  {
    id: "cabin",
    from: P([-3.2, 1.5, 2.8], [-0.6, 1.1, 0.7], 34),
    to: P([0, 1.42, 1.02], [0, 1.05, -0.7], 66),
    inside: true,
  },
  // A1 Every seat: the four screens from the back of the cabin.
  {
    id: "seats",
    from: P([0, 1.42, 1.02], [0, 1.05, -0.7], 66),
    to: P([0, 1.4, 0.92], [0, 1.04, -0.75], 72),
    inside: true,
  },
  // A2 Driver: over the driver's shoulder onto the driver's display.
  {
    id: "driver",
    from: P([0.05, 1.33, 0.32], [-0.3, 1.08, -0.75], 50),
    to: P([-0.1, 1.3, 0.1], [-0.3, 1.08, -0.75], 44),
    inside: true,
  },
  // A3 Send it to the back: from the co-pilot's screen round to the rear left screen.
  {
    id: "share",
    from: P([0.4, 1.36, 0.3], [0.36, 1.1, -0.61], 50),
    to: P([-0.02, 1.38, 0.98], [-0.36, 1.0, 0.26], 54),
    inside: true,
  },
  // A4 Climate per seat: rising out of the car to look down on all four seats.
  {
    id: "climate",
    from: P([4.8, 3.6, 4.6], [0.3, 0.7, 0.2], 30),
    to: P([3.6, 5.0, 2.3], [0.2, 0.6, 0], 30),
  },
  // A5 The road, augmented: the driver's view out through the windscreen.
  {
    id: "road",
    from: P([-0.38, 1.3, 0.16], [-0.3, 1.1, -8], 58),
    to: P([-0.38, 1.28, 0.08], [-0.15, 1.05, -8], 54),
    inside: true,
  },
  // A6 SOS: outside again, the rear three-quarter, hazard lights on.
  {
    id: "sos",
    from: P([4.8, 1.15, 6.0], [0, 0.8, 0.4], 30),
    to: P([5.8, 1.55, 3.6], [0, 0.82, 0.2], 32),
  },
  // D The live demo: back inside, settling on the driver's screen, moving by default (the demo
  // then takes the camera seat by seat).
  {
    id: "demo",
    from: P([0, 1.42, 1.0], [-0.2, 1.05, -0.4], 62),
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
  const l3 = (
    a: [number, number, number],
    b: [number, number, number],
  ): [number, number, number] => [lerp(a[0], b[0]), lerp(a[1], b[1]), lerp(a[2], b[2])];
  return {
    pos: l3(chapter.from.pos, chapter.to.pos),
    target: l3(chapter.from.target, chapter.to.target),
    fov: lerp(chapter.from.fov, chapter.to.fov),
  };
}
