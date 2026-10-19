"use client";
// One guard for buttons that save: a second tap while the first is still saving does
// nothing, and a failed save is reported (the form keeps what the teacher typed).
import { useCallback, useRef, useState } from "react";

export function useAction(): [
  busy: boolean,
  run: (fn: () => Promise<unknown>, onError: (error: unknown) => void) => Promise<void>,
] {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<unknown>, onError: (error: unknown) => void) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      console.error("Kaksha: a save failed", error);
      onError(error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  return [busy, run];
}
