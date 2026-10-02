"use client";

// Hub demo for @quartifex/heft, shown on /heft. Set a budget, then run heft's own in-page
// collectors against a light or a deliberately heavy test page in the frame below: bytes
// on load, a scripted scroll through the whole page (frames, long frames, layout shift),
// and your own click (interaction latency). The asset half weighs the hub's real
// sequence and a GLB exported from the 3D jar.
import {
  type Budget,
  evaluate,
  type Finding,
  formatValue,
  installObservers,
  type Measurements,
  parseGlb,
  readScroll,
  readTransfer,
  scrollThrough,
} from "@quartifex/heft/browser";
import { useRef, useState } from "react";
import { CylinderGeometry, Mesh, MeshStandardMaterial, Scene } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import {
  Button,
  Code,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import { SEQUENCE_URL } from "@/scene/sequence";
import shared from "./demos.module.css";
import layouts from "./layouts.module.css";
import styles from "./sequence.module.css";

const TARGETS = [
  { value: "light", label: "Light page" },
  { value: "heavy", label: "Heavy page" },
] as const;

function Findings({ findings, testid }: { findings: Finding[]; testid: string }) {
  if (findings.length === 0) return null;
  return (
    <table className={styles.table} data-testid={testid}>
      <thead>
        <tr>
          <th scope="col">Metric</th>
          <th scope="col">Measured</th>
          <th scope="col">Budget</th>
          <th scope="col">Result</th>
        </tr>
      </thead>
      <tbody>
        {findings.map((f) => (
          <tr key={`${f.metric}${f.file ?? ""}`} data-metric={f.metric} data-pass={f.pass}>
            <th scope="row">{f.metric}</th>
            <td>{formatValue(f.actual, f.unit)}</td>
            <td>{formatValue(f.limit, f.unit)}</td>
            <td className={f.pass ? shared.pass : shared.fail}>{f.pass ? "Pass" : "Over"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function exportJarGlb(): Promise<ArrayBuffer> {
  const scene = new Scene();
  const material = new MeshStandardMaterial({ color: "#0d0e0e" });
  for (const [r, h, y] of [
    [0.62, 0.12, 0.06],
    [0.6, 1.26, 0.75],
    [0.615, 0.42, 0.8],
    [0.5, 0.08, 1.42],
    [0.52, 0.32, 1.62],
  ] as const) {
    const mesh = new Mesh(new CylinderGeometry(r, r, h, 48), material);
    mesh.position.y = y;
    scene.add(mesh);
  }
  return (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer;
}

export default function Demo() {
  const [target, setTarget] = useState<"light" | "heavy">("heavy");
  const [transferKb, setTransferKb] = useState(1500);
  const [longFrames, setLongFrames] = useState(3);
  const [cls, setCls] = useState(0.1);
  const [inp, setInp] = useState(200);
  const [seconds, setSeconds] = useState(3);
  const [reduced, setReduced] = useReducedMotion();
  const [status, setStatus] = useState("Not run yet.");
  const [measured, setMeasured] = useState<Measurements>({});
  const [assets, setAssets] = useState<Measurements["assets"] | null>(null);
  const [glbInfo, setGlbInfo] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  const budget: Budget = {
    page: { transferBytes: transferKb * 1024 },
    scroll: { longFrames, cls, inp, durationMs: seconds * 1000 },
    assets: { glbBytes: 500 * 1024, triangles: 50_000, sequenceBytes: 2 * 1024 * 1024 },
  };
  const findings = evaluate({ ...measured, ...(assets ? { assets } : {}) }, budget);
  const pageFindings = findings.filter((f) => !f.metric.startsWith("assets"));
  const assetFindings = findings.filter((f) => f.metric.startsWith("assets"));

  const run = async (scroll: boolean) => {
    const el = frame.current;
    if (!el) return;
    setMeasured({});
    setStatus("Loading the test page.");
    el.src = `/sample?heavy=${target === "heavy" ? 1 : 0}&run=${Date.now()}`;
    await new Promise<void>((resolve) =>
      el.addEventListener("load", () => resolve(), { once: true }),
    );
    const win = el.contentWindow;
    if (!win) return;
    installObservers(win);
    // Long enough for the heavy page's late banner (800 ms) to land.
    await new Promise((r) => setTimeout(r, 1200));
    const page = readTransfer(win);
    if (scroll) {
      setStatus(`Scrolling the test page for ${seconds} s.`);
      await scrollThrough({ win, durationMs: seconds * 1000 });
    }
    const metrics = readScroll(win);
    setMeasured({
      page,
      ...(scroll
        ? { scroll: metrics }
        : { scroll: { ...metrics, frames: 0, longFrames: 0, p95FrameMs: 0 } }),
    });
    setStatus(
      scroll
        ? "Done. Click Buy in the test page to measure an interaction, then Read again."
        : "Load measured; the scroll test is off under reduced motion.",
    );
  };

  const reread = () => {
    const win = frame.current?.contentWindow;
    if (!win) return;
    setMeasured((m) => ({
      ...m,
      scroll: {
        ...readScroll(win),
        ...(m.scroll
          ? {
              frames: m.scroll.frames,
              longFrames: m.scroll.longFrames,
              p95FrameMs: m.scroll.p95FrameMs,
            }
          : {}),
      },
    }));
  };

  const weigh = async () => {
    const manifest = await (await fetch(`${SEQUENCE_URL}manifest.json`)).json();
    const largest = manifest.tiers.at(-1);
    const largestTierBytes = Math.max(...Object.values(largest.bytes as Record<string, number>));
    const glb = await exportJarGlb();
    const info = parseGlb(glb);
    setGlbInfo(
      `${info.meshes} meshes, ${info.triangles} triangles, ${info.materials} material, ${formatValue(info.bytes, "bytes")}`,
    );
    setAssets({
      totalBytes: info.bytes + largestTierBytes,
      textureBytes: 0,
      glbs: [{ file: "jar.glb", bytes: info.bytes, triangles: info.triangles }],
      sequences: [{ file: "sequences/jar/manifest.json", largestTierBytes }],
    });
  };

  const lead = [
    {
      metric: "page.transferBytes",
      label: "Transfer on load",
      unit: "bytes" as const,
      limit: transferKb * 1024,
    },
    {
      metric: "scroll.longFrames",
      label: "Long frames",
      unit: "count" as const,
      limit: longFrames,
    },
    { metric: "scroll.cls", label: "Layout shift", unit: "score" as const, limit: cls },
    { metric: "scroll.inp", label: "Interaction", unit: "ms" as const, limit: inp },
  ];
  const measuredPage = pageFindings.length > 0;
  const over = pageFindings.filter((f) => !f.pass).length;

  return (
    <div className={shared.demo} data-demo="heft">
      <div className={layouts.verdictRow}>
        <p className={layouts.headline} data-testid="hf-verdict">
          {measuredPage
            ? over === 0
              ? `The ${target} page is within budget.`
              : `The ${target} page is over budget on ${over} metric${over === 1 ? "" : "s"}.`
            : `Budget set. Run heft on the ${target} test page to measure it.`}
        </p>
        <p className={layouts.verdict} aria-live="polite" data-testid="hf-status">
          {status}
        </p>
      </div>

      <div className={layouts.scoreboard} data-testid="hf-scoreboard">
        {lead.map((m) => {
          const f = pageFindings.find((x) => x.metric === m.metric);
          return (
            <div key={m.metric} className={layouts.score} data-pass={f ? String(f.pass) : "none"}>
              <p className={layouts.scoreLabel}>{m.label}</p>
              <p className={layouts.scoreValue}>{f ? formatValue(f.actual, f.unit) : "–"}</p>
              <p className={`${layouts.scoreLimit} ${f && !f.pass ? layouts.over : ""}`}>
                {f ? (f.pass ? "within " : "over ") : "budget "}
                {formatValue(m.limit, m.unit)}
              </p>
            </div>
          );
        })}
      </div>

      <div className={layouts.toolbar}>
        <Controls label="Run">
          <Segmented legend="Test page" value={target} choices={TARGETS} onChange={setTarget} />
          <Button onClick={() => void run(!reduced)}>
            {reduced ? "Measure load" : "Run heft"}
          </Button>
          <Button onClick={reread}>Read again</Button>
          <ReducedMotionToggle value={reduced} onChange={setReduced} />
        </Controls>
        {measured.scroll && (
          <Readout
            label="Measured"
            rows={[
              ["Frames", measured.scroll.frames, "hf-frames"],
              ["p95 frame", `${measured.scroll.p95FrameMs} ms`],
              ["Interaction", `${measured.scroll.inp} ms`, "hf-inp"],
            ]}
          />
        )}
      </div>

      <div className={layouts.leadReverse}>
        <Controls label="Budget">
          <Slider
            label="Transfer on load"
            value={transferKb}
            min={100}
            max={3000}
            step={50}
            onChange={setTransferKb}
            format={(v) => `${v} kB`}
          />
          <Slider
            label="Long frames"
            value={longFrames}
            min={0}
            max={20}
            step={1}
            onChange={setLongFrames}
          />
          <Slider
            label="Layout shift"
            value={cls}
            min={0}
            max={0.5}
            step={0.01}
            onChange={setCls}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label="Interaction"
            value={inp}
            min={50}
            max={500}
            step={10}
            onChange={setInp}
            format={(v) => `${v} ms`}
          />
          <Slider
            label="Scroll duration"
            value={seconds}
            min={2}
            max={12}
            step={1}
            onChange={setSeconds}
            format={(v) => `${v} s`}
          />
        </Controls>
        <div className={layouts.stack}>
          <div className={styles.frameWrap}>
            <iframe
              ref={frame}
              title="Test page under measurement"
              className={styles.testFrame}
              src={`/sample?heavy=${target === "heavy" ? 1 : 0}`}
            />
          </div>
          <Findings findings={pageFindings} testid="hf-page" />
        </div>
      </div>

      <div className={shared.panel}>
        <h3 className={shared.panelTitle}>Assets</h3>
        <Controls label="Assets">
          <Button onClick={() => void weigh()}>Weigh the sequence and a GLB</Button>
        </Controls>
        {glbInfo && (
          <p className={shared.list} data-testid="hf-glb">
            jar.glb (exported from the 3D jar): {glbInfo}
          </p>
        )}
        <Findings findings={assetFindings} testid="hf-assets" />
      </div>

      <Code>{`# CI: weigh the build, then load, scroll and click the page
npx heft --budget budget.json --dir out --url http://localhost:3000/launch

# GitHub Actions
- uses: quartifex/quartifex/packages/heft@main
  with: { budget: budget.json, dir: out, url: http://localhost:3000/launch }`}</Code>
      <Note>
        In CI, heft drives the page with Playwright, so its clicks count as real interactions. Here
        the scroll is scripted inside the frame, and interaction latency needs your own click.
        {reduced
          ? " Reduced motion is on: the scroll test moves the page, so only load is measured."
          : ""}
      </Note>
    </div>
  );
}
