// Initial JavaScript of a prerendered route: every <script src> in its HTML, gzipped.
// Usage: node scripts/js-size.mjs app   (or "index" for /)
import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const route = process.argv[2] ?? "app";
const app = path.join(import.meta.dirname, "..");
const html = readFileSync(path.join(app, ".next", "server", "app", `${route}.html`), "utf8");
const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
let raw = 0;
let gz = 0;
const rows = [];
for (const src of srcs) {
  const file = path.join(app, ".next", src.replace(/^\/_next\//, ""));
  const buf = readFileSync(file);
  const g = gzipSync(buf, { level: 9 }).length;
  raw += buf.length;
  gz += g;
  rows.push([src.split("/").pop(), (g / 1024).toFixed(1)]);
}
const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].reduce(
  (n, m) => n + gzipSync(m[1] ?? "").length,
  0,
);
const out = {
  route: `/${route === "index" ? "" : route}`,
  scripts: srcs.length,
  rawKb: +(raw / 1024).toFixed(1),
  gzipKb: +(gz / 1024).toFixed(1),
  inlineGzipKb: +(inline / 1024).toFixed(1),
  files: rows,
};
console.log(JSON.stringify(out, null, 2));
