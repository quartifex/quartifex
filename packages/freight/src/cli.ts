#!/usr/bin/env node
// freight <in.glb> <out.glb> [--compress meshopt|draco|none] [--textures webp|avif|ktx2|keep]
//   [--max 2048] [--budget budget.json --app lab] [--report dir] [--types Model.tsx --url /m.glb]
import { parseArgs } from "node:util";
import { type FileOptions, freightFile, readBudget, type TextureFormat } from "./node.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    compress: { type: "string", default: "meshopt" },
    textures: { type: "string", default: "webp" },
    max: { type: "string", default: "2048" },
    quality: { type: "string", default: "82" },
    "fix-names": { type: "boolean", default: false },
    "no-dedupe": { type: "boolean", default: false },
    "no-prune": { type: "boolean", default: false },
    "no-weld": { type: "boolean", default: false },
    budget: { type: "string" },
    app: { type: "string" },
    report: { type: "string" },
    types: { type: "string" },
    url: { type: "string" },
    component: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

const [input, output] = positionals;
if (values.help || !input || !output) {
  console.log(`Usage: freight <in.glb> <out.glb> [options]

  --compress <meshopt|draco|none>        geometry compression (default meshopt)
  --textures <webp|avif|ktx2|png|jpeg|keep>  texture format (default webp; ktx2 needs toktx)
  --max <px>                             longest texture edge (default 2048)
  --quality <0-100>                      texture quality (default 82)
  --fix-names                            rename nodes, meshes and materials that break the rules
  --no-dedupe, --no-prune, --no-weld     skip a step
  --budget <budget.json> [--app <name>]  pass or fail against a "freight" block
  --report <folder>                      write freight.md and freight.json
  --types <Model.tsx> --url <path>       write a typed React Three Fiber module
  --component <Name>                     its component name (default Model)

Exits 1 when the model is over budget.`);
  process.exit(values.help ? 0 : 1);
}

const compress = values.compress as NonNullable<FileOptions["compress"]>;
if (!["meshopt", "draco", "none"].includes(compress))
  throw new Error(`freight: unknown --compress ${compress}`);
const format = values.textures as TextureFormat | "keep";
if (!["webp", "avif", "ktx2", "png", "jpeg", "keep"].includes(format)) {
  throw new Error(`freight: unknown --textures ${format}`);
}
if (values.types && !values.url)
  throw new Error("freight: --types needs --url (where the app loads the GLB)");

const { result, verdict, markdown } = await freightFile(input, output, {
  compress,
  textures: { format, maxSize: Number(values.max), quality: Number(values.quality) },
  names: { fix: values["fix-names"] },
  dedupe: !values["no-dedupe"],
  prune: !values["no-prune"],
  weld: !values["no-weld"],
  ...(values.budget ? { budget: await readBudget(values.budget, values.app) } : {}),
  ...(values.report ? { report: values.report } : {}),
  ...(values.types && values.url
    ? {
        types: {
          file: values.types,
          url: values.url,
          ...(values.component ? { component: values.component } : {}),
        },
      }
    : {}),
});

console.log(markdown);
if (result.warnings.length)
  process.stderr.write(`${result.warnings.length} warning(s), see above.\n`);
if (verdict && !verdict.pass) process.exitCode = 1;
