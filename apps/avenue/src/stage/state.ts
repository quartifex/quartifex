"use client";
// What the 3D stage and the page tell each other. React state for the few things that render
// (loading, the demo's seat); plain mutable fields for per-frame values written by scroll.
import type { SeatId } from "@/demo/system";
import { createStore } from "@/lib/store";

/** "3d" once the real-time scene runs; "poster" when the device has no WebGL. */
export type Rung = "3d" | "poster";

export const stage = createStore({
  rung: null as Rung | null,
  /** Bytes of the car model received and expected (null until the response says). */
  loaded: 0,
  total: null as number | null,
  /** The first frame with the car has been drawn. */
  ready: false,
  /** The demo has taken over the camera, on this seat. */
  demo: false,
  seat: "driver" as SeatId,
  /** The visitor has passed the preloader's gate. */
  entered: false,
  /** A seat change in flight. */
  moving: false,
});

export type Rect = { x: number; y: number; width: number; height: number; visible: boolean };

/** Per-frame values, written by scroll and read by the render loop (no re-renders). */
export const frame: {
  chapter: string;
  local: number;
  time: number;
  rect: Rect;
  onRect: null | ((r: Rect) => void);
  reducedMotion: boolean;
  pointer: { x: number; y: number };
  cut: boolean;
  drag: number;
} = {
  /** The chapter on screen (see CHAPTERS in camera.ts) and the scroll progress through it. */
  chapter: "hero",
  local: 0,
  /** Seconds the scene has run. */
  time: 0,
  /** The selected screen's rectangle on the page, in CSS px, updated each frame in the demo. */
  rect: { x: 0, y: 0, width: 0, height: 0, visible: false },
  onRect: null,
  reducedMotion: false,
  /** The pointer, -1 to 1 across the viewport, for a little parallax in the hero. */
  pointer: { x: 0, y: 0 },
  /** Jump the camera to its goal on the next frame (behind a blink, or under reduced motion). */
  cut: false,
  /** The visitor's drag on the car, in radians of yaw (springs back to 0). */
  drag: 0,
};
