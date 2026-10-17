// The camera's script. Coordinates are the demo car's, in metres: nose towards -Z, the driver
// on the left (-X, a left-hand-drive car), wheels on y = 0, the car 4.98 m long.
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
  // A pillar-to-pillar black glass display across the dash: the driver's zone at left...
  driver: { center: [-0.36, 1.005, -0.655], size: [0.4, 0.15], yaw: 0, tilt: -0.32 },
  // ...and the co-pilot's at right.
  copilot: { center: [0.3, 1.005, -0.655], size: [0.46, 0.15], yaw: 0, tilt: -0.32 },
  // The rear screens, in the backs of the front seats, facing the rear passengers.
  rearLeft: { center: [-0.37, 0.985, 0.395], size: [0.27, 0.165], yaw: Math.PI, tilt: -0.1 },
  rearRight: { center: [0.37, 0.985, 0.395], size: [0.27, 0.165], yaw: Math.PI, tilt: -0.1 },
};

/** Where each seat's occupant looks from. */
export const EYES: Record<SeatId, [number, number, number]> = {
  driver: [-0.37, 1.17, 0.12],
  copilot: [0.37, 1.17, 0.12],
  rearLeft: [-0.38, 1.12, 1.02],
  rearRight: [0.38, 1.12, 1.02],
};

/** The demo's view for a seat: just behind and above its occupant's eyes, on its screen. */
export function seatPose(seat: SeatId): Pose {
  const [ex, ey, ez] = EYES[seat];
  const [sx, sy, sz] = SCREENS[seat].center;
  const front = seat === "driver" || seat === "copilot";
  return P([ex * 0.92, ey + 0.04, ez + (front ? 0.12 : 0.08)], [sx, sy, sz], front ? 46 : 50);
}

export const CHAPTERS: Chapter[] = [
  // 00 Hero: low at the front three-quarter, headlights on, drifting round towards the side.
  {
    id: "hero",
    from: P([-3.9, 0.62, -5.6], [0.05, 0.62, -0.2], 30),
    to: P([-5.9, 0.78, -2.4], [0, 0.66, 0.1], 30),
  },
  // 01 The problem: the long side, then along it towards the rear door.
  {
    id: "problem",
    from: P([-6.6, 1.05, 0.2], [0, 0.7, 0.1], 28),
    to: P([-4.2, 1.25, 3.4], [-0.5, 0.85, 0.6], 32),
  },
  // 02 Into the cabin: up to the rear window, a blink, then inside behind the front seats.
  {
    id: "cabin",
    from: P([-2.6, 1.28, 2.2], [-0.6, 1.0, 0.7], 34),
    to: P([0, 1.2, 1.22], [0, 0.97, -0.6], 64),
    inside: true,
  },
  // A1 Every seat: the four screens from the back of the cabin.
  {
    id: "seats",
    from: P([0, 1.2, 1.22], [0, 0.97, -0.6], 64),
    to: P([0, 1.19, 1.05], [0, 0.98, -0.7], 70),
    inside: true,
  },
  // A2 Driver: over the driver's shoulder onto the driver's zone of the display.
  {
    id: "driver",
    from: P([0.04, 1.23, 0.3], [-0.36, 1.0, -0.66], 50),
    to: P([-0.08, 1.2, 0.08], [-0.36, 1.0, -0.66], 44),
    inside: true,
  },
  // A3 Send it to the back: from the co-pilot's screen round to the rear left screen.
  {
    id: "share",
    from: P([0.36, 1.22, 0.3], [0.3, 1.0, -0.66], 50),
    to: P([0.15, 1.17, 1.15], [-0.37, 0.98, 0.39], 52),
    inside: true,
  },
  // A4 Climate per seat: rising out of the car to look down on all four seats.
  {
    id: "climate",
    from: P([4.6, 3.4, 4.4], [0.3, 0.55, 0.2], 30),
    to: P([3.4, 4.8, 2.2], [0.2, 0.5, 0], 30),
  },
  // A5 The road, augmented: the driver's view out through the windscreen.
  {
    id: "road",
    from: P([-0.37, 1.2, 0.16], [-0.3, 1.0, -8], 58),
    to: P([-0.37, 1.18, 0.08], [-0.15, 0.95, -8], 54),
    inside: true,
  },
  // A6 SOS: outside again, the rear three-quarter, hazard lights on.
  {
    id: "sos",
    from: P([4.4, 1.0, 5.6], [0, 0.7, 0.4], 30),
    to: P([5.4, 1.4, 3.4], [0, 0.72, 0.2], 32),
  },
  // D The live demo: back inside, behind the rear seats, settling on the rear left screen
  // (the demo then takes the camera seat by seat).
  {
    id: "demo",
    from: P([0, 1.2, 1.2], [-0.2, 0.98, -0.2], 60),
    to: seatPose("rearLeft"),
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
