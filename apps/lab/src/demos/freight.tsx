"use client";

// Hub demo for @quartifex/freight, shown on /freight. A desk fan exported the careless way (one
// material per part, exporter default names, unwelded geometry, a 4096 px PNG label) goes
// through the preset in this tab: before and after, the budget verdict, the naming report,
// the typed R3F module, and the optimised GLB loaded back to prove it still renders.
import type { Budget, Stats } from "@quartifex/freight";
import { type BufferResult, freightBuffer } from "@quartifex/freight/browser";
import { Canvas, useThree } from "@react-three/fiber";
import * as meshoptimizer from "meshoptimizer";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BoxGeometry,
  type BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  type Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Code,
  Controls,
  Note,
  ReducedMotionToggle,
  Segmented,
  Slider,
  Toggle,
  useReducedMotion,
} from "@/components/demo/kit";
import shared from "./demos.module.css";
import layouts from "./layouts.module.css";
import styles from "./sequence.module.css";

/**
 * A desk fan as a hurried export: every part its own (identical) material, exporter default
 * names, unwelded geometry, and a 4096 px PNG for a badge the size of a coin.
 */
async function carelessGlb(): Promise<ArrayBuffer> {
  const scene = new Scene();
  const badge = document.createElement("canvas");
  badge.width = 4096;
  badge.height = 1024;
  const ctx = badge.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#e9e4d8";
    ctx.fillRect(0, 0, 4096, 1024);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "600 360px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GALE", 2048, 560);
    ctx.font = "120px ui-monospace, monospace";
    ctx.fillText("FICTIONAL BRAND", 2048, 800);
  }
  const map = new CanvasTexture(badge);
  map.colorSpace = SRGBColorSpace;
  map.name = "Image.001";
  let n = 0;
  const part = (
    name: string,
    geometry: BufferGeometry,
    color: string,
    place: (m: Mesh) => void,
  ) => {
    // toNonIndexed(): every triangle carries its own three vertices, as many exporters write them.
    const material = new MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });
    material.name = `Material.${String(++n).padStart(3, "0")}`;
    const mesh = new Mesh(geometry.toNonIndexed(), material);
    mesh.name = name;
    place(mesh);
    scene.add(mesh);
  };
  const graphite = "#2b2d2f";
  const cream = "#d9d2c3";
  part("Cylinder", new CylinderGeometry(0.62, 0.66, 0.08, 64), graphite, (m) => {
    m.position.y = 0.04;
  });
  part("Cylinder.001", new CylinderGeometry(0.045, 0.045, 1.1, 24), graphite, (m) => {
    m.position.y = 0.6;
  });
  part("Cylinder.002", new CylinderGeometry(0.2, 0.24, 0.42, 48), graphite, (m) => {
    m.rotation.x = Math.PI / 2;
    m.position.set(0, 1.25, -0.12);
  });
  for (let i = 0; i < 3; i++) {
    part(`Cube.00${i}`, new BoxGeometry(0.2, 0.62, 0.02, 4, 8, 1), cream, (m) => {
      m.position.set(0, 1.25, 0.14);
      m.rotation.z = (i * Math.PI * 2) / 3;
      m.translateY(0.36);
    });
  }
  for (const [i, z] of [0.2, 0.06].entries()) {
    part(`Torus.00${i}`, new TorusGeometry(0.76, 0.012, 8, 96), graphite, (m) => {
      m.position.set(0, 1.25, z);
    });
  }
  for (let i = 0; i < 12; i++) {
    part(`Cylinder.0${10 + i}`, new CylinderGeometry(0.006, 0.006, 1.52, 6), graphite, (m) => {
      m.position.set(0, 1.25, 0.21);
      m.rotation.z = (i * Math.PI) / 12;
    });
  }
  const badgeMaterial = new MeshStandardMaterial({ map, roughness: 0.4 });
  badgeMaterial.name = "Material.099";
  const plate = new Mesh(new PlaneGeometry(0.24, 0.06).toNonIndexed(), badgeMaterial);
  plate.name = "Plane";
  plate.position.set(0, 0.09, 0.6);
  plate.rotation.x = -Math.PI / 2.4;
  scene.add(plate);
  return (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer;
}

const kb = (n?: number) => (n === undefined ? "n/a" : `${(n / 1024).toFixed(1)} kB`);

const COMPRESS = [
  { value: "meshopt", label: "Meshopt" },
  { value: "none", label: "None" },
] as const;
const FORMATS = [
  { value: "webp", label: "WebP" },
  { value: "keep", label: "Keep PNG" },
] as const;
const SIZES = [
  { value: "512", label: "512" },
  { value: "1024", label: "1024" },
  { value: "2048", label: "2048" },
  { value: "4096", label: "4096" },
] as const;

function Row({
  name,
  metric,
  before,
  after,
  budget,
}: {
  name: string;
  metric: string;
  before: string;
  after: string;
  budget?: { limit: string; pass: boolean } | undefined;
}) {
  return (
    <tr data-metric={metric} data-pass={budget ? String(budget.pass) : undefined}>
      <th scope="row">{name}</th>
      <td>{before}</td>
      <td>{after}</td>
      <td>{budget?.limit ?? "no limit"}</td>
      <td className={budget ? (budget.pass ? shared.pass : shared.fail) : undefined}>
        {budget ? (budget.pass ? "Pass" : "Over") : ""}
      </td>
    </tr>
  );
}

export default function Demo() {
  const [compress, setCompress] = useState<"meshopt" | "none">("meshopt");
  const [format, setFormat] = useState<"webp" | "keep">("webp");
  const [maxSize, setMaxSize] = useState<"512" | "1024" | "2048" | "4096">("1024");
  const [dedupe, setDedupe] = useState(true);
  const [prune, setPrune] = useState(true);
  const [weld, setWeld] = useState(true);
  const [fix, setFix] = useState(true);
  const [joined, setJoined] = useState(false);
  const [budgetKb, setBudgetKb] = useState(150);
  const [budgetTris, setBudgetTris] = useState(5000);
  const [budgetDraws, setBudgetDraws] = useState(3);
  const [reduced, setReduced] = useReducedMotion();
  const [source, setSource] = useState<ArrayBuffer | null>(null);
  const [out, setOut] = useState<BufferResult | null>(null);
  const [status, setStatus] = useState("Exporting the fan…");
  const [download, setDownload] = useState<string | null>(null);

  useEffect(() => {
    void carelessGlb().then(setSource);
  }, []);

  const budget: Budget = useMemo(
    () => ({ bytes: budgetKb * 1024, triangles: budgetTris, drawCalls: budgetDraws }),
    [budgetKb, budgetTris, budgetDraws],
  );

  // Re-run whenever a setting changes; the latest run wins.
  useEffect(() => {
    if (!source) return;
    let live = true;
    setStatus("Running freight…");
    const started = performance.now();
    freightBuffer(source.slice(0), {
      compress,
      textures: { format, maxSize: Number(maxSize) },
      dedupe,
      prune,
      weld,
      join: joined,
      names: { fix },
      budget,
      file: "fan.glb",
      types: { url: "/models/fan.glb", component: "Fan" },
      ...(compress === "meshopt" ? { meshopt: meshoptimizer } : {}),
    })
      .then((result) => {
        if (!live) return;
        setOut(result);
        setStatus(
          `Done in ${Math.round(performance.now() - started)} ms: ${result.verdict?.pass ? "within budget" : "over budget"}.`,
        );
      })
      .catch((error: unknown) => live && setStatus(`Failed: ${String(error)}`));
    return () => {
      live = false;
    };
  }, [source, compress, format, maxSize, dedupe, prune, weld, joined, fix, budget]);

  useEffect(() => {
    if (!out) return;
    const url = URL.createObjectURL(new Blob([out.glb as BlobPart], { type: "model/gltf-binary" }));
    setDownload(url);
    return () => URL.revokeObjectURL(url);
  }, [out]);

  const check = (metric: keyof Budget, format: (n: number) => string) => {
    const c = out?.verdict?.checks.find((x) => x.metric === metric);
    return c ? { limit: format(c.limit), pass: c.pass } : undefined;
  };
  const b: Stats | undefined = out?.result.before;
  const a: Stats | undefined = out?.result.after;

  return (
    <div className={shared.demo} data-demo="freight">
      <div className={`${layouts.verdictRow} ${layouts.verdictStack}`}>
        {out ? (
          <p
            className={layouts.headline}
            data-testid="fr-verdict"
            data-pass={String(out.verdict?.pass)}
          >
            <strong className={out.verdict?.pass ? shared.pass : shared.fail}>
              {out.verdict?.pass ? "PASS" : "FAIL"}
            </strong>{" "}
            {out.verdict?.pass
              ? "The optimised fan is within the budget."
              : `${out.verdict?.checks.filter((c) => !c.pass).length} metric(s) over budget.`}
          </p>
        ) : (
          <p className={layouts.headline}>A careless export, about to be shipped.</p>
        )}
        <p className={layouts.verdict} aria-live="polite" data-testid="fr-status">
          {status}
        </p>
      </div>
      {/* Always rendered, with placeholders until the first run, so nothing shifts. */}
      <div className={layouts.scoreboard} data-testid="fr-scoreboard">
        {(
          [
            [
              "File size",
              out ? kb(out.result.before.bytes) : "–",
              out ? kb(out.result.after.bytes) : "–",
              "bytes",
            ],
            [
              "Vertices",
              out?.result.before.vertices ?? "–",
              out?.result.after.vertices ?? "–",
              null,
            ],
            [
              "Materials",
              out?.result.before.materials ?? "–",
              out?.result.after.materials ?? "–",
              null,
            ],
            [
              "Draw calls",
              out?.result.before.drawCalls ?? "–",
              out?.result.after.drawCalls ?? "–",
              "drawCalls",
            ],
          ] as const
        ).map(([label, before, after, metric]) => (
          <div
            key={label}
            className={layouts.score}
            // Budgeted metrics follow the verdict; the rest are teal only when they went down.
            data-pass={
              !out
                ? "none"
                : metric
                  ? String(out.verdict?.checks.find((c) => c.metric === metric)?.pass ?? "none")
                  : before === after
                    ? "none"
                    : "true"
            }
          >
            <p className={layouts.scoreLabel}>{label}</p>
            <p className={layouts.scoreValue}>{after}</p>
            <p className={layouts.scoreLimit}>from {before}</p>
          </div>
        ))}
      </div>
      <div className={shared.split}>
        <div className={shared.side}>
          <div className={styles.tableWrap}>
            <table className={styles.table} data-testid="fr-table">
              <caption>fan.glb before and after freight</caption>
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  <th scope="col">Before</th>
                  <th scope="col">After</th>
                  <th scope="col">Budget</th>
                  <th scope="col">
                    <span className="visually-hidden">Result</span>
                  </th>
                </tr>
              </thead>
              {/* Rows render before the first run too, so the table does not grow. */}
              <tbody>
                <Row
                  name="File size"
                  metric="bytes"
                  before={b ? kb(b.bytes) : "–"}
                  after={a ? kb(a.bytes) : "–"}
                  budget={check("bytes", kb)}
                />
                <Row
                  name="Triangles"
                  metric="triangles"
                  before={b ? String(b.triangles) : "–"}
                  after={a ? String(a.triangles) : "–"}
                  budget={check("triangles", String)}
                />
                <Row
                  name="Vertices"
                  metric="vertices"
                  before={b ? String(b.vertices) : "–"}
                  after={a ? String(a.vertices) : "–"}
                />
                <Row
                  name="Draw calls"
                  metric="drawCalls"
                  before={b ? String(b.drawCalls) : "–"}
                  after={a ? String(a.drawCalls) : "–"}
                  budget={check("drawCalls", String)}
                />
                <Row
                  name="Materials"
                  metric="materials"
                  before={b ? String(b.materials) : "–"}
                  after={a ? String(a.materials) : "–"}
                />
                <Row
                  name="Largest texture"
                  metric="maxTextureSize"
                  before={b ? `${b.maxTextureSize} px, ${b.textures[0]?.mimeType ?? ""}` : "–"}
                  after={a ? `${a.maxTextureSize} px, ${a.textures[0]?.mimeType ?? ""}` : "–"}
                />
              </tbody>
            </table>
          </div>
        </div>
        <div className={shared.side}>
          <Controls label="Preset">
            <Segmented
              legend="Geometry"
              value={compress}
              choices={COMPRESS}
              onChange={setCompress}
            />
            <Segmented legend="Textures" value={format} choices={FORMATS} onChange={setFormat} />
            <Segmented
              legend="Longest texture edge"
              value={maxSize}
              choices={SIZES}
              onChange={setMaxSize}
            />
            <Toggle label="Dedupe" checked={dedupe} onChange={setDedupe} />
            <Toggle label="Prune" checked={prune} onChange={setPrune} />
            <Toggle label="Weld" checked={weld} onChange={setWeld} />
            <Toggle label="Fix names" checked={fix} onChange={setFix} />
            <Toggle
              label="Join meshes that share a material"
              checked={joined}
              onChange={setJoined}
            />
          </Controls>
          <Note>
            Joining cuts draw calls but merges the parts: keep it off for anything that explodes,
            configures or picks parts.
          </Note>
          <Controls label="Budget">
            <Slider
              label="File size"
              value={budgetKb}
              min={25}
              max={1500}
              step={25}
              onChange={setBudgetKb}
              format={(v) => `${v} kB`}
            />
            <Slider
              label="Triangles"
              value={budgetTris}
              min={500}
              max={10000}
              step={500}
              onChange={setBudgetTris}
            />
            <Slider
              label="Draw calls"
              value={budgetDraws}
              min={1}
              max={10}
              step={1}
              onChange={setBudgetDraws}
            />
          </Controls>
        </div>
      </div>

      <div className={shared.split}>
        <div>
          <h3 className={shared.panelTitle}>The optimised GLB, loaded back</h3>
          <div className={styles.stage} style={{ aspectRatio: "4 / 3", height: "auto" }}>
            {out && (
              <Canvas
                gl={{ preserveDrawingBuffer: true }}
                dpr={[1, 2]}
                camera={{ fov: 30, position: [2.8, 2.2, 4.6] }}
                aria-hidden="true"
              >
                <color attach="background" args={["#050505"]} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[3, 5, 4]} intensity={2} />
                <Loaded glb={out.glb} spin={!reduced} />
              </Canvas>
            )}
          </div>
          <Note>
            {reduced
              ? "Reduced motion is on: the preview holds still."
              : "The preview turns slowly. Everything it shows is also in the table."}
          </Note>
          <ReducedMotionToggle value={reduced} onChange={setReduced} />
          {/* Rendered from the start so the lists below do not move when it is ready. */}
          <p>
            {download ? (
              <a href={download} download="fan.freight.glb" data-testid="fr-download">
                Download the optimised GLB ({kb(out?.glb.byteLength)})
              </a>
            ) : (
              <span className={shared.caption}>The optimised GLB, once it is ready.</span>
            )}
          </p>
        </div>
        <div className={shared.side}>
          <h3 className={shared.panelTitle}>Steps</h3>
          <ul className={shared.list} data-testid="fr-steps" style={{ minHeight: "9rem" }}>
            {out?.result.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <h3 className={shared.panelTitle}>Names</h3>
          <ul className={shared.list} data-testid="fr-names" style={{ minHeight: "22rem" }}>
            {out?.result.names.map((n) => (
              <li key={`${n.kind}-${n.name}-${n.fixed ?? ""}`}>
                {n.kind} “{n.name}”: {n.problem}
                {n.fixed ? `, renamed “${n.fixed}”` : ""}
              </li>
            ))}
          </ul>
          {out && out.result.warnings.length > 0 && (
            <>
              <h3 className={shared.panelTitle}>Warnings</h3>
              <ul className={shared.list}>
                {out.result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <h3 className={shared.panelTitle}>Typed R3F module (generated)</h3>
      <div data-testid="fr-tsx">
        <Code>{out?.tsx ?? ""}</Code>
      </div>
      <Code>{`# Node: the whole preset, KTX2 when toktx is installed, a report and typed R3F output
freight fan.glb public/models/fan.glb --textures ktx2 --max 2048 \\
  --budget budget.json --app lab --report reports/lab --types src/Fan.tsx --url /models/fan.glb

// Browser
import { freightBuffer } from "@quartifex/freight/browser";
import * as meshoptimizer from "meshoptimizer";
const { glb, verdict, markdown } = await freightBuffer(file, { meshopt: meshoptimizer, budget });`}</Code>
    </div>
  );
}

/** Parse the optimised GLB with three's loader (Meshopt decoder included) and show it. */
function Loaded({ glb, spin }: { glb: Uint8Array; spin: boolean }) {
  const group = useRef<Group>(null);
  const [scene, setScene] = useState<Group | null>(null);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(0, 0.8, 0);
  }, [camera]);
  useEffect(() => {
    let live = true;
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const buffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer;
    loader.parse(buffer, "", (gltf) => live && setScene(gltf.scene));
    return () => {
      live = false;
    };
  }, [glb]);
  useEffect(() => {
    if (!spin) return;
    let raf = 0;
    const tick = () => {
      if (group.current) group.current.rotation.y += 0.004;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spin]);
  return <group ref={group}>{scene && <primitive object={scene} />}</group>;
}
