// Builds public/sw.js before `next build`: bundles src/sw/sw.ts and fills in the list of
// files to precache (the /app shell, every hashed build file, fonts and icons).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const app = path.join(import.meta.dirname, "..");
const pub = path.join(app, "public");

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16);

const entries = [];
// The /app shell and its hashed modules (built by scripts/build-app.mjs).
const appDir = path.join(pub, "app");
if (!existsSync(path.join(appDir, "index.html")))
  throw new Error("sw: run scripts/build-app.mjs first");
entries.push({ url: "/app", revision: hash(readFileSync(path.join(appDir, "index.html"))) });
for (const file of walk(path.join(appDir, "assets"))) {
  entries.push({ url: `/app/assets/${path.basename(file)}`, revision: null });
}
// Public files the app uses.
const publicFiles = [
  "app.webmanifest",
  ...readdirSync(path.join(pub, "fonts")).map((f) => `fonts/${f}`),
  ...readdirSync(path.join(pub, "brand")).map((f) => `brand/${f}`),
  ...readdirSync(path.join(pub, "templates")).map((f) => `templates/${f}`),
];
for (const f of publicFiles) {
  // The app uses the display face for Latin headings only; Devanagari headings use Mukta.
  // The site's bold Devanagari headings are not used inside the app.
  if (f.includes("mukta-devanagari-700")) continue;
  entries.push({ url: `/${f}`, revision: hash(readFileSync(path.join(pub, f))) });
}

const result = await build({
  entryPoints: [path.join(app, "src", "sw", "sw.ts")],
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2020",
  write: false,
  define: { "self.__SW_MANIFEST": JSON.stringify(entries), "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
});
writeFileSync(path.join(pub, "sw.js"), result.outputFiles[0].text);
const bytes = entries.length;
console.log(`sw: public/sw.js written, ${bytes} files to precache`);
