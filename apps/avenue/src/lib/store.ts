"use client";
// A tiny external store (useSyncExternalStore), so the 3D stage, the scroll sections and the
// demo can share state without a library. Values that change every frame (scroll progress,
// the projected screen rectangle) live in plain refs on `frame`, not in React state.
import { useSyncExternalStore } from "react";

export function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch: Partial<T> | ((s: T) => Partial<T>)) {
      const next = typeof patch === "function" ? patch(state) : patch;
      let changed = false;
      for (const key of Object.keys(next) as Array<keyof T>) {
        if (!Object.is(state[key], next[key])) changed = true;
      }
      if (!changed) return;
      state = { ...state, ...next };
      for (const l of listeners) l();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useStore<T extends object, U>(
  store: ReturnType<typeof createStore<T>>,
  select: (s: T) => U,
): U {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.get()),
  );
}
