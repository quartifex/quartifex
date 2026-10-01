"use client";

// Hub demo for @quartifex/freight, shown on /freight. A jar exported the careless way (one
// material per part, exporter default names, unwelded geometry, a 4096 px PNG label) goes
// through the preset in this tab: before and after, the budget verdict, the naming report,
// the typed R3F module, and the optimised GLB loaded back to prove it still renders.
import type { Budget, Stats } from "@quartifex/freight";
import { type BufferResult, freightBuffer } from "@quartifex/freight/browser";
import { Canvas, useThree } from "@react-three/fiber";
import * as meshoptimizer from "meshoptimizer";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CanvasTexture,
  CylinderGeometry,
  type Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SRGBColorSpace,
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
import styles from "./sequence.module.css";

/** The jar as a hurried export: every part its own (identical) material, default names, a huge label. */
async function carelessGlb(): Promise<ArrayBuffer> {
  const scene = new Scene();
  const label = document.createElement("canvas");
  label.width = 4096;
  label.height = 1024;
  const ctx = label.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#efece4";
    ctx.fillRect(0, 0, 4096, 1024);
    ctx.fillStyle = "#0b6f65";
    ctx.fillRect(0, 740, 4096, 80);
    ctx.fillStyle = "#141414";
    ctx.font = "600 280px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NORTHFIELD", 2048, 520);
  }
  const map = new CanvasTexture(label);
  map.colorSpace = SRGBColorSpace;
  map.name = "Image.001";
  const parts: Array<[string, number, number, number, boolean]> = [
    ["Cylinder", 0.62, 0.12, 0.06, false],
    ["Cylinder.001", 0.6, 1.26, 0.75, false],
    ["Cylinder.002", 0.615, 0.42, 0.8, true],
    ["Cylinder.003", 0.5, 0.08, 1.42, false],
    ["lid", 0.52, 0.32, 1.62, false],
  ];
  parts.forEach(([name, r, h, y, labelled], i) => {
    // toNonIndexed(): every triangle carries its own three vertices, as many exporters write them.
    const geometry = new CylinderGeometry(r, r, h, 64, 4).toNonIndexed();
    const material = new MeshStandardMaterial(
      labelled ? { map, roughness: 0.5 } : { color: "#0d0e0e", roughness: 0.6 },
    );
    material.name = `Material.00${i + 1}`;
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.y = y;
    scene.add(mesh);
  });
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
  const [status, setStatus] = useState("Exporting the jar…");
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
      file: "jar.glb",
      types: { url: "/models/jar.glb", component: "Jar" },
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
      <div className={shared.split}>
        <div className={shared.side}>
          <p className={shared.panelTitle} aria-live="polite" data-testid="fr-status">
            {status}
          </p>
          {out && (
            <p data-testid="fr-verdict" data-pass={String(out.verdict?.pass)}>
              <strong className={out.verdict?.pass ? shared.pass : shared.fail}>
                {out.verdict?.pass ? "PASS" : "FAIL"}
              </strong>{" "}
              {out.verdict?.pass
                ? "The optimised jar is within the budget."
                : `${out.verdict?.checks.filter((c) => !c.pass).length} metric(s) over budget.`}
            </p>
          )}
          <div className={styles.tableWrap}>
            <table className={styles.table} data-testid="fr-table">
              <caption>jar.glb before and after freight</caption>
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
              {a && b && (
                <tbody>
                  <Row
                    name="File size"
                    metric="bytes"
                    before={kb(b.bytes)}
                    after={kb(a.bytes)}
                    budget={check("bytes", kb)}
                  />
                  <Row
                    name="Triangles"
                    metric="triangles"
                    before={String(b.triangles)}
                    after={String(a.triangles)}
                    budget={check("triangles", String)}
                  />
                  <Row
                    name="Vertices"
                    metric="vertices"
                    before={String(b.vertices)}
                    after={String(a.vertices)}
                  />
                  <Row
                    name="Draw calls"
                    metric="drawCalls"
                    before={String(b.drawCalls)}
                    after={String(a.drawCalls)}
                    budget={check("drawCalls", String)}
                  />
                  <Row
                    name="Materials"
                    metric="materials"
                    before={String(b.materials)}
                    after={String(a.materials)}
                  />
                  <Row
                    name="Largest texture"
                    metric="maxTextureSize"
                    before={`${b.maxTextureSize} px, ${b.textures[0]?.mimeType ?? ""}`}
                    after={`${a.maxTextureSize} px, ${a.textures[0]?.mimeType ?? ""}`}
                  />
                </tbody>
              )}
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
                camera={{ fov: 30, position: [3.6, 2.6, 5.4] }}
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
          {download && (
            <p>
              <a href={download} download="jar.freight.glb" data-testid="fr-download">
                Download the optimised GLB ({kb(out?.glb.byteLength)})
              </a>
            </p>
          )}
        </div>
        <div className={shared.side}>
          <h3 className={shared.panelTitle}>Steps</h3>
          <ul className={shared.list} data-testid="fr-steps">
            {out?.result.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <h3 className={shared.panelTitle}>Names</h3>
          <ul className={shared.list} data-testid="fr-names">
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
freight jar.glb public/models/jar.glb --textures ktx2 --max 2048 \\
  --budget budget.json --app lab --report reports/lab --types src/Jar.tsx --url /models/jar.glb

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
    camera.lookAt(0, 0.85, 0);
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
