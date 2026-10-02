"use client";

// The hub's demo sequence: 72 synthetic frames encoded by rushes at build time into
// public/sequences/jar (see scripts/sequence.mjs).
import type { Report } from "@quartifex/rushes";
import { type Manifest, parseManifest } from "@quartifex/rushes/manifest";
import { useEffect, useState } from "react";

export const SEQUENCE_URL = "/sequences/jar/";
/** The understudy demo's gyroscope, pre-rendered (scripts/gyro.mjs). */
export const GYRO_SEQUENCE_URL = "/sequences/gyro/";

const cache = new Map<string, Promise<{ manifest: Manifest; report: Report }>>();

function load(url: string) {
  let entry = cache.get(url);
  if (!entry) {
    entry = Promise.all([
      fetch(`${url}manifest.json`).then((r) => r.json()),
      fetch(`${url}report.json`).then((r) => r.json()),
    ]).then(([manifest, report]) => ({
      manifest: parseManifest(manifest),
      report: report as Report,
    }));
    cache.set(url, entry);
  }
  return entry;
}

export function useSequence(url = SEQUENCE_URL): { manifest: Manifest; report: Report } | null {
  const [data, setData] = useState<{ manifest: Manifest; report: Report } | null>(null);
  useEffect(() => {
    let live = true;
    load(url).then((d) => {
      if (live) setData(d);
    });
    return () => {
      live = false;
    };
  }, [url]);
  return data;
}

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} kB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
