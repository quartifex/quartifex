// Builds /app as static files in public/app: an HTML shell and hashed, code-split
// ES modules. Next.js serves them as public files (next.config rewrites /app to the
// shell). Kept outside the Next.js runtime so the app's first load stays small.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const app = path.join(import.meta.dirname, "..");
const out = path.join(app, "public", "app");
const watch = process.argv.includes("--dev");
const { PRODUCT_NAME } = await import("../src/config.ts");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const result = await build({
  entryPoints: { main: path.join(app, "src", "product", "entry.tsx") },
  bundle: true,
  splitting: true,
  format: "esm",
  target: ["es2022", "chrome100", "safari15.4", "firefox100"],
  minify: !watch,
  sourcemap: false,
  outdir: path.join(out, "assets"),
  entryNames: "[name]-[hash]",
  chunkNames: "[name]-[hash]",
  assetNames: "[name]-[hash]",
  publicPath: "/app/assets",
  metafile: true,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production") },
  loader: { ".json": "json" },
  external: ["/fonts/*", "/brand/*"],
  legalComments: "eof",
  // Keep Devanagari as UTF-8, not \u escapes: a third of the size before gzip.
  charset: "utf8",
  logLevel: "warning",
});

const outputs = Object.entries(result.metafile.outputs);
const entry = outputs.find(([p, o]) => p.endsWith(".js") && o.entryPoint?.endsWith("entry.tsx"));
if (!entry) throw new Error("build-app: no entry output");
const [jsPath, jsMeta] = entry;
const cssPath = jsMeta.cssBundle;
const url = (p) => `/app/assets/${path.basename(p)}`;

// Modules the entry imports statically load with it: preload them so they arrive in parallel.
const preload = (jsMeta.imports ?? [])
  .filter((i) => i.kind === "import-statement")
  .map((i) => url(i.path));

const prePaint = `(function(){try{var d=document.documentElement,l=localStorage;var q=new URLSearchParams(location.search).get("lang");var g=q||l.getItem("kaksha-locale");if(g==="hi"||g==="en")d.lang=g;var t=l.getItem("kaksha-theme");if(t)d.dataset.theme=t;var s=l.getItem("kaksha-size");if(s)d.dataset.size=s;}catch(e){}})();`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${PRODUCT_NAME}: mark a class</title>
<meta name="description" content="Mark tests and rubrics for a whole class on your phone. Works offline. Student data stays on the device.">
<meta name="robots" content="noindex">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7f2e7">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#11141d">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${PRODUCT_NAME}">
<link rel="manifest" href="/app.webmanifest">
<link rel="icon" href="/brand/mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">
<script>${prePaint}</script>
${cssPath ? `<link rel="stylesheet" href="${url(cssPath)}">` : ""}
${preload.map((p) => `<link rel="modulepreload" href="${p}">`).join("\n")}
<script type="module" src="${url(jsPath)}"></script>
</head>
<body>
<div id="root"><main class="lock"><div class="lock__box"><img src="/brand/mark.svg" width="88" height="88" alt=""><h1>${PRODUCT_NAME}</h1><noscript><p>This app needs JavaScript to run. Your data never leaves this device.</p></noscript></div></main></div>
</body>
</html>
`;
writeFileSync(path.join(out, "index.html"), html);

// Size report: what the first visit downloads (HTML-referenced JS), gzipped.
const initial = [
  jsPath,
  ...(jsMeta.imports ?? []).filter((i) => i.kind === "import-statement").map((i) => i.path),
];
const gz = (p) => gzipSync(readFileSync(p), { level: 9 }).length;
const initialGz = initial.reduce((n, p) => n + gz(p), 0);
const allJs = outputs.filter(([p]) => p.endsWith(".js"));
const report = {
  initialJsGzipKb: +(initialGz / 1024).toFixed(1),
  cssGzipKb: cssPath ? +(gz(cssPath) / 1024).toFixed(1) : 0,
  totalJsGzipKb: +(allJs.reduce((n, [p]) => n + gz(p), 0) / 1024).toFixed(1),
  chunks: allJs.length,
  shellHash: createHash("sha256").update(html).digest("hex").slice(0, 12),
};
writeFileSync(path.join(out, "build.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `build-app: /app initial JS ${report.initialJsGzipKb} kB gzip (${report.chunks} chunks, ${report.totalJsGzipKb} kB all), CSS ${report.cssGzipKb} kB`,
);
