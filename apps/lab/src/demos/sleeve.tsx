"use client";

// Hub demo for @quartifex/sleeve, shown on /sleeve. A bottle for a fictional olive oil with a
// wrap-around label: coverage, seam, taper, mapping, art drawn on the die-line or as a
// plain rectangle, finish, spot varnish and a foil sticker. The flat label (the die-line
// with the art in it) sits beside the canvas, so nothing depends on seeing the 3D.
import {
  type Band,
  dieline,
  dielinePoint,
  type Finish,
  labelAspect,
  type Mapping,
  type SleeveOptions,
} from "@quartifex/sleeve";
import { Sleeve } from "@quartifex/sleeve/react";
import type { SleeveDecal, SleeveLayer } from "@quartifex/sleeve/three";
import { Canvas, useThree } from "@react-three/fiber";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, type Group, LatheGeometry, Vector2 } from "three";
import {
  Button,
  Code,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Slider,
  Toggle,
  useReducedMotion,
} from "@/components/demo/kit";
import { Studio } from "@/scene/Studio";
import shared from "./demos.module.css";
import layouts from "./layouts.module.css";
import styles from "./sequence.module.css";

const INK = "#141414";
const PAPER = "#efece4";
const OLIVE = "#55602b";
const SINDOOR = "#c1440e";
// Scene units to print units: the bottle is 84 mm across.
const MM = 100;
/** Radius of the bottle at the bottom of the label. */
const RADIUS = 0.42;

const MAPPINGS = [
  { value: "developed", label: "Developed", hint: "UVs follow the flat die-cut" },
  { value: "stretch", label: "Stretch", hint: "A rectangle stretched around the band" },
] as const;
const ARTS = [
  { value: "dieline", label: "On the die-line" },
  { value: "rectangle", label: "Plain rectangle" },
] as const;
const FINISH_CHOICES = [
  { value: "gloss", label: "Gloss" },
  { value: "satin", label: "Satin" },
  { value: "matte", label: "Matte" },
] as const;

/** The label's art in label space: a plain rectangle, `w` along the label, `h` up it. */
function drawArt(ctx: CanvasRenderingContext2D, w: number, h: number, mask = false) {
  ctx.fillStyle = mask ? "#000" : PAPER;
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (mask) {
    // Spot varnish over the wordmark only.
    ctx.fillStyle = "#fff";
    ctx.font = `600 ${h * 0.28}px system-ui, sans-serif`;
    ctx.fillText("MORROW", cx, h * 0.42);
    return;
  }
  ctx.fillStyle = OLIVE;
  ctx.fillRect(0, h * 0.74, w, h * 0.08);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, h * 0.004);
  for (const y of [0.06, 0.94]) {
    ctx.beginPath();
    ctx.moveTo(0, h * y);
    ctx.lineTo(w, h * y);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.font = `600 ${h * 0.28}px system-ui, sans-serif`;
  ctx.fillText("MORROW", cx, h * 0.42);
  ctx.font = `${h * 0.07}px ui-monospace, monospace`;
  ctx.fillText("COLD-PRESSED OLIVE OIL · 500 ML · FICTIONAL BRAND", cx, h * 0.64);
  ctx.fillStyle = SINDOOR;
  ctx.beginPath();
  ctx.arc(cx + h * 1.02, h * 0.3, h * 0.025, 0, Math.PI * 2);
  ctx.fill();
  // Ingredients panel (left) and a barcode (right), so the wrap reads from every side.
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.font = `${h * 0.05}px ui-monospace, monospace`;
  ["HARVEST 2026", "Koroneiki 70%", "Arbequina 30%", "Acidity < 0.3%"].forEach((line, i) => {
    ctx.fillText(line, w * 0.06, h * (0.22 + i * 0.1));
  });
  let x = w * 0.84;
  for (let i = 0; i < 34; i++) {
    const bar = ((i * 7) % 5) + 1;
    ctx.fillRect(x, h * 0.18, bar * h * 0.004, h * 0.4);
    x += (bar + 2) * h * 0.004;
  }
  // Seam marks at both ends.
  ctx.fillRect(0, 0, h * 0.01, h);
  ctx.fillRect(w - h * 0.01, 0, h * 0.01, h);
}

/** Lay rectangular art onto the die-line: one thin slice per step along the label. */
function warpOntoDieline(
  art: HTMLCanvasElement,
  band: Band,
  options: SleeveOptions,
  out: HTMLCanvasElement,
) {
  const d = dieline(band, options);
  const ctx = out.getContext("2d");
  if (!ctx) return;
  const k = out.width / d.width;
  const P = (t: number, s: number) => {
    const [x, y] = dielinePoint(band, options, t, s);
    return [x * k, y * k] as const;
  };
  ctx.clearRect(0, 0, out.width, out.height);
  const steps = 360;
  const sw = art.width / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const o = P(t, 0);
    const r = P(t + 1 / steps, 0);
    const u = P(t, 1);
    // Source (sx..sx+sw, 0..h) to the strip from (t, bottom) along and up the die-line.
    const ax = (r[0] - o[0]) / sw;
    const ay = (r[1] - o[1]) / sw;
    const bx = (u[0] - o[0]) / art.height;
    const by = (u[1] - o[1]) / art.height;
    const sx = i * sw;
    ctx.setTransform(
      ax,
      ay,
      -bx,
      -by,
      o[0] - sx * ax + art.height * bx,
      o[1] - sx * ay + art.height * by,
    );
    ctx.drawImage(art, sx, 0, sw * 1.6, art.height, sx, 0, sw * 1.6, art.height);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

/** The print (and its varnish mask) as canvases at the right aspect for the chosen mapping and art. */
function labelCanvases(band: Band, options: SleeveOptions, art: "dieline" | "rectangle") {
  const textureWidth = 2048;
  // The art as designed for a straight bottle: average circumference by slant height.
  const plain = labelAspect(band, { ...options, mapping: "stretch" });
  // UVs run 0 to 1 whatever the canvas size, so each art simply fills the texture: plain
  // art fills the die-line's box (developed) or the band (stretch); die-line art is the
  // rectangle laid onto the die-line, as a designer would place it.
  const make = (mask: boolean) => {
    const rect = canvas(textureWidth, textureWidth / plain);
    const ctx = rect.getContext("2d");
    if (ctx) drawArt(ctx, rect.width, rect.height, mask);
    if (art === "rectangle") return rect;
    const developed = { ...options, mapping: "developed" as const };
    const out = canvas(textureWidth, textureWidth / labelAspect(band, developed));
    warpOntoDieline(rect, band, developed, out);
    return out;
  };
  return { print: make(false), mask: make(true) };
}

function stickerTexture() {
  const c = canvas(256, 256);
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#d8d4c8";
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 64px system-ui, sans-serif";
    ctx.fillText("FIRST", 128, 116);
    ctx.font = "22px ui-monospace, monospace";
    ctx.fillText("HARVEST", 128, 170);
  }
  const mask = canvas(256, 256);
  const m = mask.getContext("2d");
  if (m) {
    m.fillStyle = "#000";
    m.fillRect(0, 0, 256, 256);
    m.fillStyle = "#fff";
    m.beginPath();
    m.arc(128, 128, 124, 0, Math.PI * 2);
    m.fill();
  }
  return { print: new CanvasTexture(c), mask: new CanvasTexture(mask) };
}

const NOTES: Record<string, string> = {
  "developed:dieline":
    "What the printed label looks like: art laid out on the die-line lands straight and undistorted on the taper.",
  "developed:rectangle":
    "A rectangle printed for a straight bottle, wrapped on a taper: the text arcs and the corners are cut off by the die-line.",
  "stretch:rectangle":
    "A plain stretch looks tidy, but no flat label can do this: letters squeeze toward the narrow end, so the render misleads about the print.",
  "stretch:dieline": "Die-line art stretched as a rectangle: wrong both ways.",
};

export default function Demo() {
  const [coverage, setCoverage] = useState(360);
  const [seam, setSeam] = useState(180);
  const [top, setTop] = useState(0.36);
  const [mapping, setMapping] = useState<Mapping>("developed");
  const [art, setArt] = useState<"dieline" | "rectangle">("dieline");
  const [finish, setFinish] = useState<Finish>("satin");
  const [varnish, setVarnish] = useState(true);
  const [sticker, setSticker] = useState(true);
  const [turn, setTurn] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useReducedMotion();
  const [flat, setFlat] = useState<string | null>(null);

  const band: Band = useMemo(
    () => ({ radius: RADIUS, radiusTop: top, height: 1.0, y: 0.15 }),
    [top],
  );
  const options: SleeveOptions = useMemo(
    () => ({ coverage, seam, mapping }),
    [coverage, seam, mapping],
  );
  const textures = useMemo(() => {
    if (typeof document === "undefined") return null;
    const { print, mask } = labelCanvases(band, options, art);
    return { print, mask, map: new CanvasTexture(print), alpha: new CanvasTexture(mask) };
  }, [band, options, art]);
  const stickerTex = useMemo(() => (typeof document === "undefined" ? null : stickerTexture()), []);

  useEffect(() => {
    if (!textures) return;
    // The flat label for the side panel, cut to the die-line.
    setFlat(textures.print.toDataURL("image/png"));
    return () => {
      textures.map.dispose();
      textures.alpha.dispose();
    };
  }, [textures]);

  const layers: SleeveLayer[] = useMemo(() => {
    if (!textures) return [];
    const print: SleeveLayer = { map: textures.map, finish };
    return varnish ? [print, { mask: textures.alpha, finish: "varnish" }] : [print];
  }, [textures, finish, varnish]);
  const decals: SleeveDecal[] = useMemo(
    () =>
      sticker && stickerTex
        ? [
            {
              at: 34,
              y: 0.85,
              width: 0.22,
              height: 0.22,
              layers: [{ map: stickerTex.print, mask: stickerTex.mask, finish: "foil" }],
            },
          ]
        : [],
    [sticker, stickerTex],
  );

  // Play turns the bottle. Off under reduced motion: the slider turns it in steps you control.
  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setTurn((t) => (t + ((now - last) / 1000) * 40) % 360);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  const die = dieline(band, options);
  const shownDie = dieline(band, { ...options, mapping: "developed" });
  const straight = Math.abs(top - RADIUS) < 0.005;
  const note = straight
    ? "On a straight bottle both mappings agree: the die-line is a rectangle."
    : NOTES[`${mapping}:${art}`];

  return (
    <div className={shared.demo} data-demo="sleeve">
      <div className={layouts.lead}>
        <div>
          <div className={styles.stage} style={{ height: "min(64vh, 40rem)" }}>
            <Canvas
              gl={{ preserveDrawingBuffer: true }}
              dpr={[1, 2]}
              camera={{ fov: 30, position: [0, 1.6, 6.6] }}
              aria-hidden="true"
            >
              <color attach="background" args={["#0b0a08"]} />
              <Studio />
              <ambientLight intensity={0.15} />
              <directionalLight position={[3, 4, 5]} intensity={1.6} />
              <directionalLight position={[-4, 2, -2]} intensity={0.9} color="#ffd9a8" />
              <LookAt />
              <Bottle band={band} turn={turn}>
                {layers.length > 0 && (
                  <Sleeve band={band} layers={layers} decals={decals} {...options} />
                )}
              </Bottle>
            </Canvas>
          </div>
          <p className={shared.caption}>
            Concept visual. Morrow is a fictional brand, drawn in code for this demo.
          </p>
        </div>
        <div className={shared.side}>
          <Readout
            label="Die-line"
            rows={[
              ["Shape", shownDie.shape, "sl-shape"],
              [
                "Flat size",
                `${Math.round(shownDie.width * MM)} x ${Math.round(shownDie.height * MM)} mm`,
                "sl-size",
              ],
              [
                "Sector angle",
                shownDie.angle ? `${shownDie.angle.toFixed(1)}°` : "none",
                "sl-angle",
              ],
              ["Art aspect", `${(die.width / die.height).toFixed(2)} : 1`, "sl-aspect"],
            ]}
          />
          <figure className={shared.flat}>
            <svg
              viewBox={`0 0 ${shownDie.width} ${shownDie.height}`}
              role="img"
              aria-label={`The label flat: a ${shownDie.shape}, ${Math.round(shownDie.width * MM)} by ${Math.round(shownDie.height * MM)} millimetres, with the art as it would print`}
              data-testid="sl-dieline"
            >
              <defs>
                <clipPath id="sl-cut">
                  <path d={shownDie.path} />
                </clipPath>
              </defs>
              {flat && mapping === "developed" && (
                <image
                  href={flat}
                  width={shownDie.width}
                  height={shownDie.height}
                  preserveAspectRatio="none"
                  clipPath="url(#sl-cut)"
                />
              )}
              <path
                d={shownDie.path}
                fill="none"
                stroke="currentColor"
                strokeWidth={shownDie.height / 120}
              />
            </svg>
            <figcaption>
              {mapping === "developed"
                ? "The label flat: the die-line with the art as it prints."
                : "The die-line. Stretch mapping has no flat equivalent, so no art is shown."}
            </figcaption>
          </figure>
          <Note>{note}</Note>
          {reduced && (
            <Note>Reduced motion is on: Play is off. Turn the bottle with the slider.</Note>
          )}
        </div>
      </div>
      <div className={layouts.controlGrid}>
        <Controls label="Label">
          <Slider
            label="Coverage"
            value={coverage}
            min={60}
            max={370}
            step={5}
            onChange={setCoverage}
            format={(v) => `${v}°`}
          />
          <Slider
            label="Seam"
            value={seam}
            min={0}
            max={355}
            step={5}
            onChange={setSeam}
            format={(v) => `${v}°`}
          />
          <Slider
            label="Top diameter"
            value={top}
            min={0.3}
            max={0.54}
            step={0.02}
            onChange={setTop}
            format={(v) => `${Math.round(v * 2 * MM)} mm`}
          />
          <Segmented legend="Mapping" value={mapping} choices={MAPPINGS} onChange={setMapping} />
          <Segmented legend="Art" value={art} choices={ARTS} onChange={setArt} />
          <Segmented legend="Finish" value={finish} choices={FINISH_CHOICES} onChange={setFinish} />
          <Toggle label="Spot varnish on the wordmark" checked={varnish} onChange={setVarnish} />
          <Toggle label="Foil sticker" checked={sticker} onChange={setSticker} />
        </Controls>
        <Controls label="View">
          <Slider
            label="Turn"
            value={Math.round(turn)}
            min={0}
            max={359}
            step={1}
            onChange={(v) => {
              setPlaying(false);
              setTurn(v);
            }}
            format={(v) => `${v}°`}
          />
          <Button
            onClick={() => setPlaying((p) => !p)}
            disabled={reduced}
            pressed={playing && !reduced}
          >
            {playing && !reduced ? "Pause" : "Play"}
          </Button>
          <ReducedMotionToggle value={reduced} onChange={setReduced} />
        </Controls>
      </div>
      <Code>{`<Sleeve
  band={{ radius: 0.42, radiusTop: 0.36, height: 1, y: 0.15 }}
  coverage={360} seam={180} mapping="developed"
  layers={[{ map: print, finish: "satin" }, { mask: wordmark, finish: "varnish" }]}
  decals={[{ at: 34, y: 0.9, width: 0.22, height: 0.22, layers: [{ map: sticker, mask: round, finish: "foil" }] }]}
/>
// Author the print on dielineSvg(band) at labelAspect(band): it lands undistorted.`}</Code>
    </div>
  );
}

/** The vessel: a lathe-turned amber bottle whose label band matches `band`, with a neck and cap. */
function Bottle({ band, turn, children }: { band: Band; turn: number; children: ReactNode }) {
  const group = useRef<Group>(null);
  const r1 = band.radiusTop ?? band.radius;
  const top = (band.y ?? 0) + band.height;
  const neck = 0.12;
  const body = useMemo(
    () =>
      new LatheGeometry(
        [
          new Vector2(0, 0),
          new Vector2(band.radius - 0.03, 0),
          new Vector2(band.radius, 0.03),
          new Vector2(band.radius, band.y ?? 0),
          new Vector2(r1, top),
          new Vector2(r1, top + 0.06),
          new Vector2(r1 * 0.8, top + 0.28),
          new Vector2(neck * 1.4, top + 0.5),
          new Vector2(neck, top + 0.62),
          new Vector2(neck, top + 0.92),
          new Vector2(0, top + 0.92),
        ],
        96,
      ),
    [band.radius, band.y, r1, top],
  );
  useEffect(() => () => body.dispose(), [body]);
  return (
    <group ref={group} rotation={[0, (-turn * Math.PI) / 180, 0]}>
      <mesh geometry={body}>
        <meshPhysicalMaterial
          color="#2a1405"
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>
      <mesh position={[0, top + 1.02, 0]}>
        <cylinderGeometry args={[neck * 1.12, neck * 1.12, 0.22, 64]} />
        <meshPhysicalMaterial color="#c9a45c" metalness={1} roughness={0.3} />
      </mesh>
      {children}
    </group>
  );
}

function LookAt() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(0, 1.15, 0);
  }, [camera]);
  return null;
}
