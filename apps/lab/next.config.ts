import path from "node:path";
import type { NextConfig } from "next";

// The hub reads catalog/ and assets/icons/ from the repo root at build time, so
// tracing and Turbopack both need the monorepo root, not just this app.
const repoRoot = path.join(import.meta.dirname, "..", "..");

// Brand font files are never committed. Locally they sit in public/fonts (filled by
// `pnpm fonts`); on a deploy without them, QX_FONT_ORIGIN points at the private CDN
// path and /fonts/* is proxied there. Public files win over this fallback rewrite.
const fontOrigin = process.env.QX_FONT_ORIGIN;

const config: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  reactStrictMode: true,
  async rewrites() {
    if (!fontOrigin) return [];
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [{ source: "/fonts/:file", destination: `${fontOrigin.replace(/\/$/, "")}/:file` }],
    };
  },
};

export default config;
