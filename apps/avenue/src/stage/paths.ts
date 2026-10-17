// Camera paths for dolly. The journey path runs with the page's scroll from the hero to the
// demo: the car in profile at night, round to the front, along to the rear-left coach door,
// through it into the cabin, then to the seat the demo starts on. Seat views are where the
// camera rests for each seat's screen in the demo. Coordinates as in src/three/shape.ts.
import { parsePath } from "@quartifex/dolly";
import { SEATS, type SeatId } from "@/three/shape";

/** Where along the journey (0 to 1) each beat happens. Sections key their copy off these. */
export const BEATS = {
  hero: 0,
  problem: 0.3,
  door: 0.58,
  inside: 0.78,
  demo: 1,
} as const;

/** The door's opening, from its start to fully open, as journey progress. */
export const DOOR_OPEN = { from: 0.5, to: 0.66, angle: 1.32 } as const;

/** The four screens wake one after another as the camera arrives inside. */
export const SCREEN_WAKE: Record<SeatId, [number, number]> = {
  driver: [0.72, 0.8],
  copilot: [0.75, 0.83],
  rearLeft: [0.78, 0.86],
  rearRight: [0.81, 0.89],
};

/** Seat views: from just behind the occupant's eyes towards their screen. */
export function seatView(seat: SeatId): {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
} {
  const s = SEATS[seat];
  const [ex, ey, ez] = s.eye;
  const [sx, sy, sz] = s.screen.center;
  const front = seat === "driver" || seat === "copilot";
  // Just above the occupant's eyes and a little outboard, in front of the headrest.
  const side = Math.sign(ez) * (front ? 0.12 : 0.14);
  return {
    position: [ex - 0.04, ey + 0.06, ez + side],
    target: [sx, sy, sz],
    fov: front ? 50 : 46,
  };
}

const rearLeft = seatView("rearLeft");

export const journeyPath = parsePath({
  version: 1,
  keys: [
    {
      at: 0,
      position: [2.7, 0.78, 9.6],
      target: [2.66, 1.42, 0],
      fov: 26,
      chapter: "Profile",
      ease: "inOut",
    },
    { at: 0.16, position: [1.6, 0.8, 9.1], target: [2.6, 1.34, 0], fov: 27, ease: "inOut" },
    {
      at: 0.36,
      position: [-4.1, 1.05, 5.4],
      target: [2.3, 0.78, 0],
      fov: 28,
      chapter: "The problem",
      ease: "inOut",
    },
    {
      at: 0.56,
      position: [4.6, 1.4, 4.1],
      target: [3.35, 1.0, 0.5],
      fov: 34,
      chapter: "The door",
      ease: "inOut",
    },
    { at: 0.7, position: [3.42, 1.24, 1.42], target: [3.0, 1.04, 0], fov: 48, ease: "inOut" },
    {
      at: 0.86,
      position: [4.3, 1.3, 0.02],
      target: [1.9, 0.98, 0],
      fov: 58,
      chapter: "Inside",
      ease: "inOut",
    },
    {
      at: 1,
      position: rearLeft.position,
      target: rearLeft.target,
      fov: rearLeft.fov,
      chapter: "Demo",
    },
  ],
  buckets: {
    "tall-phone": { distance: 1.2 },
    tablet: { distance: 1.08 },
  },
});

/** The sun the volumetric light comes from: high, behind the car from the hero's view. */
export const SUN: [number, number, number] = [4.6, 4.4, -10];
