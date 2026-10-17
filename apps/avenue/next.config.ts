import path from "node:path";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const repoRoot = path.join(import.meta.dirname, "..", "..");

const config: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  pageExtensions: ["ts", "tsx"],
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" },
        ],
      },
      {
        source: "/sequences/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

// Docs are MDX (content/docs). Plugins by name, so the config also works with Turbopack.
const withMDX = createMDX({ options: { remarkPlugins: [["remark-gfm", {}]] } });

export default withMDX(config);
