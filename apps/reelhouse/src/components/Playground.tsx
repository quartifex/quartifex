"use client";

// The playground: drop a video (or take our sample), encode it into tiers in this tab with
// rushes' preview encoder, play it back with reel, read reel's live stats in viewfinder, and
// weigh it against a budget the way rushes and heft do. Nothing is uploaded: the clip, the
// frames and the report stay in this browser.
import { createReel, type Reel } from "@quartifex/reel";
import {
  encodableFormats,
  encodePreview,
  type FrameSource,
  formatBytes,
  framePath,
  type Preview,
  type Tier,
} from "@quartifex/rushes/browser";
import { createViewfinder, type Viewfinder } from "@quartifex/viewfinder";
import { reelSource } from "@quartifex/viewfinder/reel";
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { loadManifest, SEQUENCE_URL, useManifest, useReducedMotion } from "@/lib/sequence";
import {
  avifRatio,
  budgetJson,
  cliCommand,
  DEFAULTS,
  heftFindings,
  reportFor,
  type Settings,
  WIDTH_CHOICES,
} from "@/lib/weight";
import styles from "./Playground.module.css";

type Input = { kind: "file"; file: File } | { kind: "sample" };
type Status =
  | { kind: "idle" }
  | { kind: "encoding"; done: number; total: number }
  | { kind: "ready"; seconds: number }
  | { kind: "error"; message: string };

/** Our hero sequence as a frame source: its largest WebP tier, redrawn frame by frame. */
async function sampleSource(): Promise<FrameSource> {
  const manifest = await loadManifest();
  const tier = manifest.tiers[manifest.tiers.length - 1] as Tier;
  return {
    frames: tier.frames,
    width: tier.width,
    height: tier.height,
    draw: async (ctx, index) => {
      const url = SEQUENCE_URL + framePath(manifest, tier, "webp", index);
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      ctx.drawImage(bitmap, 0, 0, ctx.canvas.width, ctx.canvas.height);
      bitmap.close();
    },
  };
}

export function Playground() {
  const hero = useManifest();
  const reduced = useReducedMotion();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [input, setInput] = useState<Input | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [encodable, setEncodable] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [encodedWith, setEncodedWith] = useState<Settings | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    encodableFormats()
      .then(setEncodable)
      .catch(() => setEncodable([]));
  }, []);

  // Release the object URLs of a preview we no longer show.
  useEffect(() => () => preview?.dispose(), [preview]);
  useEffect(() => () => abort.current?.abort(), []);

  async function encode(next: Input, using: Settings = settings) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setInput(next);
    setStatus({ kind: "encoding", done: 0, total: using.maxFrames });
    const started = performance.now();
    try {
      const source = next.kind === "file" ? next.file : await sampleSource();
      const result = await encodePreview({
        input: source,
        name: next.kind === "file" ? next.file.name : "aperture (sample)",
        widths: using.widths,
        maxFrames: using.maxFrames,
        quality: { webp: using.quality },
        poster: 0,
        signal: controller.signal,
        onProgress: (done, total) => setStatus({ kind: "encoding", done, total }),
      });
      if (controller.signal.aborted) return result.dispose();
      setPreview(result);
      setEncodedWith(using);
      setStatus({ kind: "ready", seconds: (performance.now() - started) / 1000 });
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message.replace(/^rushes: /, "")
            : "Something went wrong while encoding.",
      });
    }
  }

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void encode({ kind: "file", file });
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = [...event.dataTransfer.files].find((f) => f.type.startsWith("video/"));
    if (file) void encode({ kind: "file", file });
    else setStatus({ kind: "error", message: "That was not a video file." });
  };

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const toggleWidth = (w: number) =>
    update({
      widths: settings.widths.includes(w)
        ? settings.widths.filter((x) => x !== w)
        : [...settings.widths, w].sort((a, b) => a - b),
    });

  // Budgets re-weigh the frames already encoded; widths, frames and quality need a re-encode.
  const report = useMemo(
    () => (preview ? reportFor(preview.manifest, preview.files, settings) : null),
    [preview, settings],
  );
  const findings = useMemo(
    () => (preview ? heftFindings(preview.manifest, preview.files, settings.tierBudget) : []),
    [preview, settings.tierBudget],
  );
  const ratio = avifRatio(hero);
  const stale =
    encodedWith !== null &&
    (encodedWith.maxFrames !== settings.maxFrames ||
      encodedWith.quality !== settings.quality ||
      encodedWith.widths.join() !== settings.widths.join());
  const encoding = status.kind === "encoding";
  const noEncoder = encodable !== null && encodable.length === 0;
  const fileName = input?.kind === "file" ? input.file.name : "clip.mp4";

  return (
    <section id="playground" className={styles.section} aria-labelledby="playground-title">
      <header className={styles.head}>
        <p className="mono">Playground</p>
        <h2 id="playground-title" className={styles.h2}>
          Encode a clip here. Nothing leaves this tab.
        </h2>
        <p className={styles.lede}>
          rushes' preview encoder samples your video into frames and writes each tier with this
          browser's own image encoder. reel plays the result; the weights are the real bytes of
          those frames. For shipping, the same settings run through the CLI.
        </p>
      </header>

      <div className={styles.grid}>
        <div className={styles.controls}>
          <fieldset
            className={styles.drop}
            data-dragging={dragging || undefined}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <legend className="visually-hidden">Your video</legend>
            <label htmlFor="clip" className={styles.dropLabel}>
              <span className={styles.dropTitle}>Drop a video, or choose one</span>
              <span className={styles.dropHint}>
                Any clip this browser plays: MP4, WebM, MOV. A few seconds is plenty.
              </span>
            </label>
            <input
              id="clip"
              className={styles.file}
              type="file"
              accept="video/*"
              onChange={onFile}
              disabled={noEncoder}
            />
            <button
              type="button"
              className={styles.sample}
              onClick={() => void encode({ kind: "sample" })}
              disabled={encoding || noEncoder}
            >
              Use our sample
            </button>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className="mono">Tier widths</legend>
            <div className={styles.chips}>
              {WIDTH_CHOICES.map((w) => (
                <label key={w} className={styles.chip}>
                  <input
                    type="checkbox"
                    checked={settings.widths.includes(w)}
                    onChange={() => toggleWidth(w)}
                    disabled={settings.widths.length === 1 && settings.widths.includes(w)}
                  />
                  <span>{w}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Range
            label="Frames"
            value={settings.maxFrames}
            min={24}
            max={144}
            step={12}
            format={(v) => `${v}`}
            onChange={(v) => update({ maxFrames: v })}
          />
          <Range
            label="WebP quality"
            value={settings.quality}
            min={40}
            max={95}
            step={5}
            format={(v) => `${v}`}
            onChange={(v) => update({ quality: v })}
          />
          <Range
            label="Budget per tier"
            value={settings.tierBudget}
            min={256 * 1024}
            max={5 * 1024 * 1024}
            step={256 * 1024}
            format={formatBytes}
            onChange={(v) => update({ tierBudget: v })}
          />
          <Range
            label="First screen budget"
            value={settings.initialBudget}
            min={100 * 1024}
            max={1500 * 1024}
            step={50 * 1024}
            format={formatBytes}
            onChange={(v) => update({ initialBudget: v })}
          />

          {input && !encoding && (
            <button type="button" className={styles.reencode} onClick={() => void encode(input)}>
              {stale ? "Re-encode with the new settings" : "Encode again"}
            </button>
          )}

          <p className={styles.status} role="status" aria-live="polite" data-testid="pg-status">
            {noEncoder
              ? "This browser cannot encode WebP or AVIF images, so the playground cannot run here. The rushes CLI does the same job on your machine."
              : status.kind === "encoding"
                ? `Encoding frame ${status.done} of ${status.total}…`
                : status.kind === "ready"
                  ? `Encoded ${preview?.manifest.frames} frames into ${preview?.manifest.tiers.length} tiers in ${status.seconds.toFixed(1)} s.`
                  : status.kind === "error"
                    ? `Could not encode: ${status.message}`
                    : "Waiting for a clip."}
          </p>
          {status.kind === "encoding" && (
            <progress
              className={styles.progress}
              max={status.total}
              value={status.done}
              aria-label="Encoding progress"
            />
          )}
        </div>

        <div className={styles.results}>
          <Player preview={preview} reduced={reduced} />

          {preview && report ? (
            <>
              <div className={styles.verdict} data-pass={report.pass} data-testid="pg-verdict">
                <span className="mono">rushes</span>
                <strong>{report.pass ? "Within budget" : "Over budget"}</strong>
                <span className="mono">heft</span>
                <strong>
                  {findings.every((f) => f.pass)
                    ? "Largest tier within sequenceBytes"
                    : "Largest tier over sequenceBytes"}
                </strong>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table} data-testid="pg-table">
                  <caption className="mono">
                    {preview.manifest.name} · {preview.manifest.frames} frames ·{" "}
                    {preview.manifest.source.width}×{preview.manifest.source.height}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Tier</th>
                      <th scope="col">Format</th>
                      <th scope="col">Frames</th>
                      <th scope="col">Total</th>
                      <th scope="col">Per frame</th>
                      <th scope="col">First screen</th>
                      <th scope="col">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lines.map((line) => (
                      <tr key={`${line.tier}-${line.format}`} data-pass={line.pass}>
                        <th scope="row">{line.tier}</th>
                        <td>{line.format}</td>
                        <td>{line.frames}</td>
                        <td>{formatBytes(line.bytes)}</td>
                        <td>{formatBytes(line.averageFrame)}</td>
                        <td>{formatBytes(line.initialBytes)}</td>
                        <td>{line.pass ? "pass" : "over"}</td>
                      </tr>
                    ))}
                    {ratio !== null &&
                      !preview.manifest.formats.includes("avif") &&
                      report.lines
                        .filter((l) => l.format === "webp")
                        .map((line) => (
                          <tr key={`${line.tier}-avif`} className={styles.estimate}>
                            <th scope="row">{line.tier}</th>
                            <td>avif*</td>
                            <td>{line.frames}</td>
                            <td>{formatBytes(Math.round(line.bytes * ratio))}</td>
                            <td>{formatBytes(Math.round(line.averageFrame * ratio))}</td>
                            <td>{formatBytes(Math.round(line.initialBytes * ratio))}</td>
                            <td>estimate</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
              {ratio !== null && !preview.manifest.formats.includes("avif") && (
                <p className={styles.note}>
                  * This browser cannot encode AVIF, so the AVIF rows are an estimate: the WebP
                  bytes times {ratio.toFixed(2)}, the AVIF-to-WebP ratio the CLI measured on our
                  sample. Your footage will differ; run the CLI for real numbers.
                </p>
              )}
              <div className={styles.ship}>
                <p className="mono">Ship it with the CLI</p>
                <pre>
                  <code>{cliCommand(fileName, settings)}</code>
                </pre>
                <p className="mono">budget.json</p>
                <pre>
                  <code>{budgetJson(settings)}</code>
                </pre>
              </div>
            </>
          ) : (
            <p className={styles.empty}>
              The tier table, the budget verdict and the commands to ship it appear here once a clip
              is encoded.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = `pg-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className={styles.range}>
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id} className="mono">
        {format(value)}
      </output>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** reel playing the preview's blobs, with a scrub, a tier switch and viewfinder on demand. */
function Player({ preview, reduced }: { preview: Preview | null; reduced: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reel = useRef<Reel | null>(null);
  const finder = useRef<Viewfinder | null>(null);
  const stats = useRef<HTMLSpanElement>(null);
  const [progress, setProgress] = useState(0);
  const [tier, setTier] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!preview || !canvas.current) return;
    const tiers = preview.manifest.tiers;
    const initial = tiers[tiers.length - 1]?.name ?? null;
    setTier(initial);
    setProgress(0);
    const created = createReel(canvas.current, preview.manifest, {
      baseUrl: "",
      urlFor: preview.url,
      fit: "contain",
      // The visitor drives every frame change here, so frames load even under reduced motion.
      reducedMotion: false,
      ...(initial ? { tier: initial } : {}),
      onFrame: () => {
        const s = created.stats();
        if (stats.current) {
          stats.current.textContent = `frame ${s.shown + 1} / ${s.frames} · ${s.tier} · ${s.format} · ${s.loaded} in memory`;
        }
      },
    });
    created.seek(0);
    reel.current = created;
    // viewfinder reads reel's stats live; Alt+V or the button opens it.
    finder.current = createViewfinder({ sources: [reelSource(created, preview.manifest.name)] });
    return () => {
      finder.current?.destroy();
      finder.current = null;
      created.destroy();
      reel.current = null;
    };
  }, [preview]);

  // Play: a slow loop through the sequence, started and stopped by the visitor only.
  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const r = reel.current;
      if (!r) return;
      const next = (r.progress + (now - last) / 4000) % 1;
      last = now;
      r.seek(next);
      setProgress(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  const aspect = preview
    ? `${preview.manifest.source.width} / ${preview.manifest.source.height}`
    : "16 / 10";

  return (
    <div className={styles.player}>
      <div className={styles.screen} style={{ aspectRatio: aspect }}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          role="img"
          aria-label={
            preview
              ? `Your encoded clip, ${preview.manifest.name}, at frame ${Math.round(progress * (preview.manifest.frames - 1)) + 1} of ${preview.manifest.frames}.`
              : "The encoded clip appears here."
          }
        />
        {!preview && <span className={`mono ${styles.placeholder}`}>No clip yet</span>}
      </div>
      <div className={styles.transport}>
        <label htmlFor="pg-scrub" className="mono">
          Scrub
        </label>
        <input
          id="pg-scrub"
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          disabled={!preview}
          aria-valuetext={
            preview
              ? `frame ${Math.round(progress * (preview.manifest.frames - 1)) + 1} of ${preview.manifest.frames}`
              : undefined
          }
          onChange={(e) => {
            const p = Number(e.target.value) / 1000;
            setProgress(p);
            reel.current?.seek(p);
          }}
        />
        {!reduced && (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={!preview}
            aria-pressed={playing}
          >
            {playing ? "Pause" : "Play"}
          </button>
        )}
      </div>
      {preview && (
        <div className={styles.tiers}>
          <fieldset className={styles.fieldset}>
            <legend className="mono">Tier</legend>
            <div className={styles.chips}>
              {preview.manifest.tiers.map((t) => (
                <label key={t.name} className={styles.chip}>
                  <input
                    type="radio"
                    name="pg-tier"
                    checked={tier === t.name}
                    onChange={() => {
                      setTier(t.name);
                      reel.current?.setTier(t.name);
                    }}
                  />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="button" className={styles.finder} onClick={() => finder.current?.toggle()}>
            Viewfinder <span className="mono">Alt+V</span>
          </button>
        </div>
      )}
      <span ref={stats} className={`mono ${styles.stats}`} data-testid="pg-stats" />
    </div>
  );
}
