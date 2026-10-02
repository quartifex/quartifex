"use client";

// Hub demo for @quartifex/volumetric, shown on /volumetric. Light through a grove of trunks,
// in both variants: the WebGL pass on a live R3F scene, and the canvas overlay on a still of
// the same grove (the image-sequence case). One set of controls drives both; the GPU tier
// shows how quality scales, and reduced motion holds the light still. Concept visual.
import { kelvinToCss, qualityFor, resolveSettings, type Settings } from "@quartifex/volumetric";
import { VolumetricLight } from "@quartifex/volumetric/r3f";
import { VolumetricOverlay } from "@quartifex/volumetric/react";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Code,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import shared from "./demos.module.css";
import layouts from "./layouts.module.css";

const VARIANTS = [
  { value: "webgl", label: "WebGL pass", hint: "Real-time shafts over a live scene" },
  { value: "canvas", label: "Canvas overlay", hint: "Shafts and dust over a still or a sequence" },
] as const;
const TIERS = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
] as const;

/** The grove: trunk positions (x, z) and radii, shared by the 3D scene and the 2D still. */
const TRUNKS: Array<[number, number, number]> = [
  [-5.2, -3, 0.32],
  [-3.4, -6, 0.26],
  [-2.1, -2.4, 0.38],
  [-0.6, -7.5, 0.22],
  [0.7, -4.2, 0.3],
  [2.2, -2.8, 0.42],
  [3.6, -6.8, 0.24],
  [4.9, -3.6, 0.34],
  [6.4, -5.4, 0.28],
  [-6.8, -6.2, 0.3],
];
/** The sun, behind the grove and just above the frame, left of centre: the light streams down. */
const SUN: [number, number, number] = [-7, 24, -26];
const CAMERA = { position: [0, 1.6, 6] as [number, number, number], fov: 45 };

export default function Demo() {
  const [variant, setVariant] = useState<"webgl" | "canvas">("webgl");
  const [density, setDensity] = useState(0.65);
  const [scatter, setScatter] = useState(0.7);
  const [temperature, setTemperature] = useState(4800);
  const [dust, setDust] = useState(0.6);
  const [drift, setDrift] = useState(0.5);
  const [tier, setTier] = useState<"0" | "1" | "2" | "3">("2");
  const [reduced, setReduced] = useReducedMotion();

  const settings: Partial<Settings> = useMemo(
    // The overlay places the light in screen space where the 3D sun projects.
    () => ({ density, scatter, temperature, dust, drift, source: { x: 0.28, y: -0.12 } }),
    [density, scatter, temperature, dust, drift],
  );
  const quality = useMemo(
    () => qualityFor({ gpuTier: Number(tier) as 0 | 1 | 2 | 3, reducedMotion: reduced }),
    [tier, reduced],
  );
  const resolved = resolveSettings(settings);

  return (
    <div className={shared.demo} data-demo="volumetric">
      <div className={layouts.lead}>
        <div
          className={layouts.stage3d}
          data-testid="vl-stage"
          data-variant={variant}
          role="img"
          aria-label={`Shafts of ${resolved.temperature} K light falling through a grove of trees, drawn by the ${variant === "webgl" ? "WebGL pass" : "canvas overlay"}`}
        >
          {variant === "webgl" ? (
            <Canvas
              gl={{ preserveDrawingBuffer: true, antialias: true }}
              dpr={[1, 1.5]}
              camera={{ fov: CAMERA.fov, position: CAMERA.position }}
              aria-hidden="true"
            >
              <Grove />
              <VolumetricLight
                settings={settings}
                quality={quality}
                reducedMotion={reduced}
                sun={SUN}
              />
            </Canvas>
          ) : (
            <>
              <GroveStill />
              <VolumetricOverlay settings={settings} quality={quality} reducedMotion={reduced} />
            </>
          )}
        </div>
        <div className={shared.side}>
          <Readout
            label="Volumetric"
            rows={[
              ["Variant", variant === "webgl" ? "WebGL pass" : "Canvas overlay", "vl-variant"],
              ["Samples", variant === "webgl" ? quality.samples : "n/a", "vl-samples"],
              [
                "Pass resolution",
                variant === "webgl" ? `${Math.round(quality.resolution * 100)}%` : "n/a",
              ],
              ["Beams", variant === "canvas" ? quality.beams : "n/a"],
              ["Dust motes", Math.round(quality.particles * resolved.dust), "vl-dust"],
              ["Motion", quality.animate ? "drifting" : "still", "vl-motion"],
              [
                "Light",
                <span key="light" className={layouts.swatchRow}>
                  <span
                    className={layouts.swatch}
                    style={{ background: kelvinToCss(resolved.temperature) }}
                    aria-hidden="true"
                  />
                  {resolved.temperature} K, {kelvinToCss(resolved.temperature)}
                </span>,
                "vl-light",
              ],
            ]}
          />
          <Note>
            {reduced
              ? "Reduced motion is on: the shafts and dust hold a fixed arrangement; every control still changes the light."
              : "The light drifts slowly and dust rises through it; motes glow only inside the shafts. Concept visual: a grove built in code."}
          </Note>
        </div>
      </div>
      <div className={layouts.controlGrid}>
        <Controls label="Variant and quality">
          <Segmented legend="Variant" value={variant} choices={VARIANTS} onChange={setVariant} />
          <Segmented legend="GPU tier" value={tier} choices={TIERS} onChange={setTier} />
          <ReducedMotionToggle value={reduced} onChange={setReduced} />
        </Controls>
        <Controls label="Light">
          <Slider
            label="Density"
            value={density}
            min={0}
            max={1}
            step={0.01}
            onChange={setDensity}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Slider
            label="Scatter"
            value={scatter}
            min={0}
            max={1}
            step={0.01}
            onChange={setScatter}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Slider
            label="Colour temperature"
            value={temperature}
            min={1800}
            max={10000}
            step={100}
            onChange={setTemperature}
            format={(v) => `${v} K`}
          />
        </Controls>
        <Controls label="Medium">
          <Slider
            label="Dust"
            value={dust}
            min={0}
            max={1}
            step={0.01}
            onChange={setDust}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Slider
            label="Drift"
            value={drift}
            min={0}
            max={1}
            step={0.01}
            onChange={setDrift}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </Controls>
      </div>
      <Code>{`// WebGL: inside the R3F Canvas (it draws the final frame)
<VolumetricLight sun={[-7, 24, -26]} settings={{ density: 0.65, scatter: 0.7, temperature: 4800 }}
  quality={qualityFor({ gpuTier, quality: useQuality(understudy) })} />

// Canvas: over a reel sequence or a hero image
<div style={{ position: "relative" }}>
  <canvas ref={reelCanvas} />
  <VolumetricOverlay settings={{ density: 0.65, scatter: 0.7, temperature: 4800 }} />
</div>`}</Code>
    </div>
  );
}

/** Trunks, a ground and mist, lit from the sun behind them. */
function Grove() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(0, 2.6, -6);
  }, [camera]);
  return (
    <>
      <color attach="background" args={["#0b1112"]} />
      <fog attach="fog" args={["#0b1112", 6, 26]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={SUN} intensity={1.2} color="#ffe2b8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0f1513" roughness={1} />
      </mesh>
      {TRUNKS.map(([x, z, r]) => (
        <mesh key={`${x}${z}`} position={[x, 7, z]}>
          <cylinderGeometry args={[r * 0.8, r, 14, 16]} />
          <meshStandardMaterial color="#1b1612" roughness={0.9} />
        </mesh>
      ))}
      {/* A canopy across the top, with gaps the light comes through. */}
      {[-6, -2.5, 1.5, 5].map((x, i) => (
        <mesh key={x} position={[x, 13.5 - (i % 2) * 0.8, -9]} rotation={[0, 0, (i - 1.5) * 0.08]}>
          <boxGeometry args={[2.6, 1.2, 10]} />
          <meshStandardMaterial color="#121a14" roughness={1} />
        </mesh>
      ))}
    </>
  );
}

/** The same grove as a 2D still, for the canvas variant. */
function GroveStill() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(el.clientWidth * dpr);
      const h = Math.round(el.clientHeight * dpr);
      el.width = w;
      el.height = h;
      ctx.fillStyle = "#0b1112";
      ctx.fillRect(0, 0, w, h);
      // Ground band.
      ctx.fillStyle = "#0f1513";
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      // Trunks in perspective: nearer is wider and darker.
      const sorted = [...TRUNKS].sort((a, b) => a[1] - b[1]);
      for (const [x, z, r] of sorted) {
        const depth = 6 - z;
        const sx = w / 2 + (x / depth) * w * 0.62;
        const width = (r / depth) * w * 0.9;
        const shade = Math.round(18 + depth * 1.4);
        ctx.fillStyle = `rgb(${shade + 9} ${shade + 4} ${shade})`;
        ctx.fillRect(sx - width / 2, 0, width, h * 0.72 + (1 / depth) * h * 0.6);
      }
      ctx.fillStyle = "#121a14";
      ctx.fillRect(0, 0, w, h * 0.06);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <canvas
      ref={canvas}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
