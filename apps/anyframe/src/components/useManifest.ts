"use client";

import { type Manifest, parseManifest } from "@quartifex/rushes/manifest";
import { useEffect, useState } from "react";
import { SEQUENCE_URL } from "@/scene/scene";

let cache: Promise<Manifest> | null = null;

/** The QUASAR reveal's rushes manifest, fetched once per page. */
export function useManifest(): Manifest | null {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  useEffect(() => {
    let live = true;
    cache ??= fetch(`${SEQUENCE_URL}manifest.json`)
      .then((r) => r.json())
      .then(parseManifest);
    cache.then((m) => live && setManifest(m)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return manifest;
}

/** The visitor's reduced-motion setting, live. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    const on = () => setReduced(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return reduced;
}
