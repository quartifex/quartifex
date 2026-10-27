"use client";

import { useEffect } from "react";

/** Adds the kit's LAB tag to every logo on the page once the logo canvases have mounted. */
export function LabTag() {
  useEffect(() => {
    let stop: (() => void) | undefined;
    let alive = true;
    const t = setTimeout(() => {
      import("@/lib/lab-tag").then(({ initLabTag }) => {
        if (alive) stop = initLabTag();
      });
    }, 60);
    return () => {
      alive = false;
      clearTimeout(t);
      stop?.();
    };
  }, []);
  return null;
}
