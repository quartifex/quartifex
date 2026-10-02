"use client";

import { type Manifest, parseManifest } from "@quartifex/rushes/manifest";
import { useEffect, useState } from "react";

/** The hero sequence, encoded by rushes at build time (scripts/sequence.mjs). */
export const SEQUENCE_URL = "/sequences/aperture/";

let cache: Promise<Manifest> | null = null;

/** Fetch the hero manifest once per page. */
export function loadManifest(): Promise<Manifest> {
  cache ??= fetch(`${SEQUENCE_URL}manifest.json`)
    .then((r) => r.json())
    .then(parseManifest);
  return cache;
}

/** The hero manifest, or null until it arrives. */
export function useManifest(): Manifest | null {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  useEffect(() => {
    let live = true;
    loadManifest()
      .then((m) => live && setManifest(m))
      .catch(() => {});
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
