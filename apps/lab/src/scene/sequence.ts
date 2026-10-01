"use client";

// The hub's demo sequence: 72 synthetic frames encoded by rushes at build time into
// public/sequences/jar (see scripts/sequence.mjs).
import type { Report } from "@quartifex/rushes";
import { type Manifest, parseManifest } from "@quartifex/rushes/manifest";
import { useEffect, useState } from "react";

export const SEQUENCE_URL = "/sequences/jar/";

let cache: Promise<{ manifest: Manifest; report: Report }> | null = null;

function load() {
  cache ??= Promise.all([
    fetch(`${SEQUENCE_URL}manifest.json`).then((r) => r.json()),
    fetch(`${SEQUENCE_URL}report.json`).then((r) => r.json()),
  ]).then(([manifest, report]) => ({
    manifest: parseManifest(manifest),
    report: report as Report,
  }));
  return cache;
}

export function useSequence(): { manifest: Manifest; report: Report } | null {
  const [data, setData] = useState<{ manifest: Manifest; report: Report } | null>(null);
  useEffect(() => {
    let live = true;
    load().then((d) => {
      if (live) setData(d);
    });
    return () => {
      live = false;
    };
  }, []);
  return data;
}

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} kB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
