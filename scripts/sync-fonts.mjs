#!/usr/bin/env node
// Copies the self-hosted brand fonts into every app's public/fonts/ (git-ignored).
// Source: QX_FONT_DIR, or ../assets-private/fonts next to this repo. Missing source is
// not an error: apps then fall back to system fonts or to QX_FONT_ORIGIN.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const source = process.env.QX_FONT_DIR ?? path.join(root, "..", "assets-private", "fonts");
const FACES = [
  "ClashDisplay-Variable.woff2",
  "Satoshi-Variable.woff2",
  "Satoshi-VariableItalic.woff2",
];

if (!existsSync(source)) {
  console.log(`fonts: no source at ${source}; apps will use system fallbacks.`);
  process.exit(0);
}

const found = FACES.filter((file) => existsSync(path.join(source, file)));
const missing = FACES.filter((file) => !found.includes(file));
if (missing.length) console.log(`fonts: missing in source: ${missing.join(", ")}`);

const appsDir = path.join(root, "apps");
for (const app of readdirSync(appsDir, { withFileTypes: true })) {
  if (!app.isDirectory()) continue;
  const target = path.join(appsDir, app.name, "public", "fonts");
  mkdirSync(target, { recursive: true });
  for (const file of found) copyFileSync(path.join(source, file), path.join(target, file));
  console.log(`fonts: ${found.length} file(s) -> apps/${app.name}/public/fonts`);
}
