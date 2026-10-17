"use client";
// What the 3D stage and the page tell each other. React state for the few things that render
// (the rung, loading, the demo's seat); plain mutable fields for per-frame values.
import type { SeatId } from "@/demo/system";
import { createStore } from "@/lib/store";

export type Rung = "webgl" | "sequence" | "poster";

export const stage = createStore({
  rung: null as Rung | null,
  /** Which backend three's WebGPURenderer ended up on, once it has started. */
  backend: null as "webgpu" | "webgl" | null,
  /** Bytes of the car model received and expected (null until the response says). */
  loaded: 0,
  total: null as number | null,
  /** Engine started and the first frame drawn. */
  ready: false,
  /** The demo has taken over the camera, on this seat. */
  demo: false,
  seat: "rearLeft" as SeatId,
  /** A seat change in flight (the camera flying, the panel folded into the screen). */
  moving: false,
  bucket: "laptop" as string,
});

export type Rect = { x: number; y: number; width: number; height: number; visible: boolean };

/** Per-frame values, written by scroll and read by the render loop (no re-renders). */
export const frame: {
  progress: number;
  time: number;
  rect: Rect;
  onRect: null | ((r: Rect) => void);
  reducedMotion: boolean;
} = {
  /** Scroll progress through the journey, 0 to 1. */
  progress: 0,
  /** Seconds the page has been visible. */
  time: 0,
  /** The selected screen's rectangle on the page, in CSS px, updated each frame in the demo. */
  rect: { x: 0, y: 0, width: 0, height: 0, visible: false },
  /** Called when `rect` changes; the demo's anchor element follows it. */
  onRect: null,
  reducedMotion: false,
};
