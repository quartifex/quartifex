import path from "node:path";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const repoRoot = path.join(import.meta.dirname, "..", "..");

// /app may talk to nothing but this origin. The CSP makes that a rule the browser
// enforces, not only a promise: no analytics, no error reporting, no third-party code.
const appCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  // quartifex.com shows /app in a phone frame on the Kaksha case study.
  "frame-ancestors 'self' https://quartifex.com https://www.quartifex.com",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const config: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  poweredByHeader: false,
  // /app is a static, code-split React bundle in public/app (scripts/build-app.mjs).
  // The product page is English only; the app keeps Hindi. Old /hi links land on /.
  async redirects() {
    return [{ source: "/hi", destination: "/", permanent: true }];
  },
  async rewrites() {
    return [
      { source: "/app", destination: "/app/index.html" },
      { source: "/app/", destination: "/app/index.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/app/:path*",
        headers: [{ key: "Content-Security-Policy", value: appCsp }],
      },
      {
        source: "/app/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/app",
        headers: [
          { key: "Content-Security-Policy", value: appCsp },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/fonts/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

const withMDX = createMDX({ options: { remarkPlugins: [["remark-gfm"]] } });
export default withMDX(config);
