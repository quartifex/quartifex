"use client";

import { type Manifest, parseManifest } from "@quartifex/rushes/manifest";
import { useEffect, useState } from "react";

/** The dawn sequence, encoded by rushes at build time (scripts/sequence.mjs). */
export const SEQUENCE_URL = "/sequences/dawn/";

/** Where the sun sits in the frame at sunrise (scripts/dawn.mjs): the shafts' source. */
export const SUN = { x: 0.62, y: 0.33 };

let cache: Promise<Manifest> | null = null;

/** The dawn manifest, or null until it arrives. Fetched once per page. */
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
