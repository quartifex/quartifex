// Runs before `next dev` and `next build`. Everything it writes is generated, and
// git-ignored where the repo rules say so (fonts and raster never go into git).
//  1. Copies the self-hosted fonts from the @fontsource packages (SIL OFL 1.1) into public/fonts.
//  2. Renders the PNG app icons from the SVG marks.
//  3. Writes the published template schema to public/schema/template.v1.json.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const app = path.join(import.meta.dirname, "..");
const pub = path.join(app, "public");
const req = (p) => path.join(app, "node_modules", p);

// 1. Fonts. Only the weights the app and site use.
const FONTS = [
  [
    "@fontsource/inter/files",
    ["inter-latin-400-normal", "inter-latin-500-normal", "inter-latin-600-normal"],
  ],
  [
    "@fontsource/barlow-condensed/files",
    ["barlow-condensed-latin-600-normal", "barlow-condensed-latin-700-normal"],
  ],
  [
    "@fontsource/mukta/files",
    ["mukta-devanagari-400-normal", "mukta-devanagari-600-normal", "mukta-devanagari-700-normal"],
  ],
];
mkdirSync(path.join(pub, "fonts"), { recursive: true });
for (const [dir, files] of FONTS) {
  for (const f of files)
    copyFileSync(path.join(req(dir), `${f}.woff2`), path.join(pub, "fonts", `${f}.woff2`));
}

// 2. Icons.
const brand = path.join(pub, "brand");
const mark = readFileSync(path.join(brand, "mark.svg"));
const maskable = readFileSync(path.join(brand, "maskable.svg"));
const icons = [
  [mark, 192, "icon-192.png"],
  [mark, 512, "icon-512.png"],
  [maskable, 512, "maskable-512.png"],
  [maskable, 192, "maskable-192.png"],
  [maskable, 180, "apple-touch-icon.png"],
];
for (const [svg, size, name] of icons) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(path.join(brand, name));
}

// 3. Schema, from the same Zod definition the app validates with.
const { templateJsonSchema } = await import("../src/lib/template.ts");
mkdirSync(path.join(pub, "schema"), { recursive: true });
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://kaksha.quartifex.com/schema/template.v1.json",
  title: "Kaksha template (version 1)",
  description:
    "An answer-key test or a rubric that teachers can share. See https://kaksha.quartifex.com/docs/templates",
  ...templateJsonSchema(),
};
delete schema.$schema;
writeFileSync(
  path.join(pub, "schema", "template.v1.json"),
  `${JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", ...schema }, null, 2)}\n`,
);
// 4. The web app manifest, named from the single PRODUCT_NAME constant.
const { PRODUCT_NAME } = await import("../src/config.ts");
const manifest = {
  id: "/app",
  name: `${PRODUCT_NAME}: mark a class`,
  short_name: PRODUCT_NAME,
  description:
    "Mark tests and rubrics for a whole class. Works offline. Student data stays on the phone.",
  start_url: "/app",
  scope: "/app",
  display: "standalone",
  orientation: "any",
  background_color: "#f3f2f8",
  theme_color: "#f3f2f8",
  lang: "en-IN",
  categories: ["education", "productivity"],
  icons: [
    { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/brand/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
writeFileSync(path.join(pub, "app.webmanifest"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log("prepare: fonts, icons, schema and manifest written");
