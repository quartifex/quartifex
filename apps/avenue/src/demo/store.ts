"use client";
// The demo's state as an external store: the DOM screens and the 3D screen textures read the
// same system. Selectors must return parts of the state (stable references), not new objects.
import { createStore, useStore } from "@/lib/store";
import { type Action, initialSystem, reduce, type System } from "./system";

export const demo = createStore({ system: initialSystem() });

export function dispatch(action: Action) {
  demo.set((s) => ({ system: reduce(s.system, action) }));
}

export function useSystem<U>(select: (s: System) => U): U {
  return useStore(demo, (s) => select(s.system));
}
