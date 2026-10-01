// Node runner for @quartifex/freight, published as `@quartifex/freight/node`: reads and
// writes files with glTF-Transform's NodeIO, encodes textures with sharp (optional peer)
// and KTX2 with KTX-Software's `toktx` (from the PATH or FREIGHT_TOKTX), compresses with
// meshoptimizer or draco3dgltf (optional peers), writes the report and the typed module.
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  type Budget,
  type EncodedImage,
  type FreightOptions,
  type FreightResult,
  freight,
  inspect,
  r3fModule,
  report,
  type TextureEncoder,
  type Verdict,
  verdict,
} from "./index.js";

export * from "./index.js";

type Sharp = (input: Uint8Array) => {
  resize(o: {
    width: number;
    height: number;
    fit: "inside";
    withoutEnlargement: true;
  }): ReturnType<Sharp>;
  webp(o: { quality: number; nearLossless?: boolean; effort?: number }): ReturnType<Sharp>;
  avif(o: { quality: number; effort?: number }): ReturnType<Sharp>;
  png(): ReturnType<Sharp>;
  jpeg(o: { quality: number }): ReturnType<Sharp>;
  toBuffer(o: {
    resolveWithObject: true;
  }): Promise<{ data: Buffer; info: { width: number; height: number } }>;
};

async function load<T>(name: string): Promise<T | null> {
  try {
    const mod = (await import(name)) as { default?: T } & T;
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

/** Texture encoder backed by sharp: resize to fit, then WebP, AVIF, PNG or JPEG. */
export async function sharpEncoder(): Promise<TextureEncoder | null> {
  const sharp = await load<Sharp>("sharp");
  if (!sharp) return null;
  return async (input, target) => {
    let image = sharp(input.image).resize({
      width: target.maxSize,
      height: target.maxSize,
      fit: "inside",
      withoutEnlargement: true,
    });
    const data = target.role === "data";
    if (target.format === "webp")
      image = image.webp({ quality: target.quality, nearLossless: data, effort: 5 });
    else if (target.format === "avif")
      image = image.avif({ quality: data ? 90 : target.quality, effort: 4 });
    else if (target.format === "jpeg") image = image.jpeg({ quality: target.quality });
    else image = image.png();
    const out = await image.toBuffer({ resolveWithObject: true });
    const mime = {
      webp: "image/webp",
      avif: "image/avif",
      jpeg: "image/jpeg",
      png: "image/png",
      ktx2: "",
    }[target.format];
    return {
      image: new Uint8Array(out.data),
      mimeType: mime || "image/png",
      width: out.info.width,
      height: out.info.height,
    };
  };
}

const toktxPath = () => process.env.FREIGHT_TOKTX || "toktx";

function run(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

/** Whether KTX-Software's toktx can be run. */
export async function hasToktx(): Promise<boolean> {
  try {
    return (await run(toktxPath(), ["--version"])) === 0;
  } catch {
    return false;
  }
}

/**
 * KTX2 (Basis Universal) through toktx: UASTC for data textures (normals and the like),
 * ETC1S for colour. Resizes and writes PNG with sharp first.
 */
export async function ktx2Encoder(png: TextureEncoder): Promise<TextureEncoder> {
  return async (input, target) => {
    const resized = await png(input, { ...target, format: "png" });
    if (!resized) return null;
    const dir = await mkdtemp(path.join(tmpdir(), "freight-"));
    try {
      const src = path.join(dir, "in.png");
      const out = path.join(dir, "out.ktx2");
      await writeFile(src, resized.image);
      const data = target.role === "data";
      const args = [
        "--t2",
        "--genmipmap",
        "--encode",
        data ? "uastc" : "etc1s",
        ...(data
          ? ["--uastc_quality", "2", "--zcmp", "19"]
          : ["--qlevel", String(Math.round(target.quality * 2.55))]),
        "--assign_oetf",
        data ? "linear" : "srgb",
        out,
        src,
      ];
      if ((await run(toktxPath(), args)) !== 0) return null;
      const image = new Uint8Array(await readFile(out));
      return {
        image,
        mimeType: "image/ktx2",
        width: resized.width,
        height: resized.height,
      } satisfies EncodedImage;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

/** A NodeIO that reads and writes every extension freight uses, with codecs when installed. */
export async function createIO(): Promise<{ io: NodeIO; meshoptEncoder: unknown }> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const meshopt = await load<{
    MeshoptEncoder: { ready: Promise<void> };
    MeshoptDecoder: { ready: Promise<void> };
  }>("meshoptimizer");
  let meshoptEncoder: unknown;
  if (meshopt?.MeshoptEncoder) {
    await meshopt.MeshoptEncoder.ready;
    await meshopt.MeshoptDecoder.ready;
    meshoptEncoder = meshopt.MeshoptEncoder;
    io.registerDependencies({
      "meshopt.encoder": meshopt.MeshoptEncoder,
      "meshopt.decoder": meshopt.MeshoptDecoder,
    });
  }
  const draco = await load<{
    createEncoderModule(): Promise<unknown>;
    createDecoderModule(): Promise<unknown>;
  }>("draco3dgltf");
  if (draco?.createEncoderModule) {
    io.registerDependencies({
      "draco3d.encoder": await draco.createEncoderModule(),
      "draco3d.decoder": await draco.createDecoderModule(),
    });
  }
  return { io, meshoptEncoder };
}

/** The `freight` block of one app in a `budget.json`. */
export async function readBudget(file: string, app?: string): Promise<Budget> {
  const raw = JSON.parse(await readFile(file, "utf8")) as {
    freight?: Budget;
    apps?: Array<{ app?: string; freight?: Budget }>;
  };
  if (!app) {
    if (raw.freight) return raw.freight;
    throw new Error(`freight: ${file} has no top-level "freight" block; pass an app name`);
  }
  const entry = raw.apps?.find((a) => a.app === app);
  if (!entry?.freight) throw new Error(`freight: no "freight" block for app "${app}" in ${file}`);
  return entry.freight;
}

export type FileOptions = Omit<FreightOptions, "encodeTexture" | "meshoptEncoder"> & {
  budget?: Budget;
  /** Folder for `freight.md` and `freight.json`. */
  report?: string;
  /** Write a typed R3F module: where, the URL the app loads the GLB from, and the component name. */
  types?: { file: string; url: string; component?: string };
};

export type FileResult = { result: FreightResult; verdict?: Verdict; markdown: string };

/** Run the preset on a file and write the optimised GLB (plus report and types, if asked). */
export async function freightFile(
  input: string,
  output: string,
  options: FileOptions = {},
): Promise<FileResult> {
  const { io, meshoptEncoder } = await createIO();
  const doc = await io.read(input);
  const before = (await stat(input)).size;
  const warnings: string[] = [];
  const opts: FreightOptions = { ...options };
  const png = await sharpEncoder();
  let format = options.textures?.format ?? "webp";
  if (format === "ktx2" && !(await hasToktx())) {
    warnings.push(
      "KTX2 was asked for, but toktx (KTX-Software) was not found: textures are WebP instead.",
    );
    format = "webp";
  }
  opts.textures = { ...options.textures, format };
  if (png) opts.encodeTexture = format === "ktx2" ? await ktx2Encoder(png) : png;
  if (meshoptEncoder) opts.meshoptEncoder = meshoptEncoder;
  if (!png) warnings.push("sharp is not installed: textures were measured, not re-encoded.");

  const result = await freight(doc, opts);
  result.warnings.unshift(...warnings);
  await mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await io.write(output, doc);
  result.before.bytes = before;
  result.after = inspect(doc, (await stat(output)).size);

  const check = options.budget ? verdict(result.after, options.budget) : undefined;
  const markdown = report(result, check, path.basename(input));
  if (options.report) {
    await mkdir(options.report, { recursive: true });
    await writeFile(path.join(options.report, "freight.md"), markdown);
    await writeFile(
      path.join(options.report, "freight.json"),
      `${JSON.stringify({ file: path.basename(input), ...result, verdict: check }, null, 2)}\n`,
    );
  }
  if (options.types) {
    await mkdir(path.dirname(path.resolve(options.types.file)), { recursive: true });
    await writeFile(
      options.types.file,
      r3fModule(doc, {
        url: options.types.url,
        ...(options.types.component ? { component: options.types.component } : {}),
      }),
    );
  }
  return { result, ...(check ? { verdict: check } : {}), markdown };
}
