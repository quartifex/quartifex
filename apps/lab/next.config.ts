import path from "node:path";
import type { NextConfig } from "next";

// The hub reads catalog/ and assets/icons/ from the repo root at build time, so
// tracing and Turbopack both need the monorepo root, not just this app.
const repoRoot = path.join(import.meta.dirname, "..", "..");

const config: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  reactStrictMode: true,
};

export default config;
