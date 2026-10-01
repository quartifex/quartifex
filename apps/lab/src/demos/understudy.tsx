"use client";

// Hub demo for @quartifex/understudy, shown on /understudy. The jar in WebGL with shadows,
// a vignette pass and a particle ring, governed by understudy: slow frames (measured, or
// simulated with the slider) step quality down, a lost context or the bottom of the ladder
// hands off to the image sequence through reel, reduced motion goes to the poster. Every
// change is written to a log, so nothing depends on watching the scene.
import type { Environment, State, Understudy } from "@quartifex/understudy";
import { Governor, useQuality } from "@quartifex/understudy/r3f";
import { Ladder, useUnderstudy } from "@quartifex/understudy/react";
import { createStandIn, type StandIn } from "@quartifex/understudy/reel";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { BufferAttribute, BufferGeometry, type Group, type WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";
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
import { Jar3D } from "@/scene/Jar3D";
import { SEQUENCE_URL, useSequence } from "@/scene/sequence";
import shared from "./demos.module.css";
import styles from "./sequence.module.css";

const PARTICLES = 6000;
const RUNG_NAMES: Record<State["rung"], string> = {
  webgl: "WebGL",
  sequence: "Image sequence",
  poster: "Poster",
};

const DEVICES = [
  { value: "this", label: "This browser", hint: "What this browser reports" },
  { value: "capable", label: "Capable GPU", hint: "Simulated: hardware WebGL" },
  { value: "software", label: "Software WebGL", hint: "Simulated: WebGL without a GPU" },
  { value: "none", label: "No WebGL", hint: "Simulated: no WebGL at all" },
] as const;
type DeviceId = (typeof DEVICES)[number]["value"];
const DEVICE_ENV: Record<DeviceId, Partial<Environment>> = {
  this: {},
  capable: { webgl: true, majorPerformanceCaveat: false },
  software: { webgl: true, majorPerformanceCaveat: true },
  none: { webgl: false },
};
const TIERS = [
  { value: "unknown", label: "Unknown" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
] as const;
const SOURCES = [
  { value: "measured", label: "Measured" },
  { value: "simulated", label: "Simulated" },
] as const;

export default function Demo() {
  const [device, setDevice] = useState<DeviceId>("this");
  const [tier, setTier] = useState<"unknown" | "1" | "2" | "3">("unknown");
  const [source, setSource] = useState<"measured" | "simulated">("measured");
  const [simulated, setSimulated] = useState(40);
  const [work, setWork] = useState(0);
  const [progress, setProgress] = useState(0.3);
  const [reduced, setReduced] = useReducedMotion();
  const environment = useMemo(
    () => ({
      ...DEVICE_ENV[device],
      ...(tier === "unknown" ? {} : { gpuTier: Number(tier) as 1 | 2 | 3 }),
    }),
    [device, tier],
  );
  // A short window so the demo reacts in seconds rather than tens of seconds.
  const [state, understudy] = useUnderstudy({ fps: { window: 500 } }, environment);
  const sequence = useSequence();
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const frameTime = useRef<number | undefined>(undefined);
  frameTime.current = source === "simulated" ? simulated : undefined;
  const workRef = useRef(work);
  workRef.current = work;
  const gl = useRef<WebGLRenderer | null>(null);
  const [glReady, setGlReady] = useState(false);

  useEffect(() => {
    understudy?.setReducedMotion(reduced);
  }, [understudy, reduced]);

  // The stand-in: a reel on its own canvas, created when WebGL steps aside.
  const reelCanvas = useRef<HTMLCanvasElement>(null);
  const standIn = useRef<StandIn | null>(null);
  useEffect(() => {
    const canvas = reelCanvas.current;
    if (!understudy || !sequence || !canvas) return;
    const created = createStandIn(canvas, sequence.manifest, {
      baseUrl: SEQUENCE_URL,
      understudy,
      progress: () => progressRef.current,
      fit: "cover",
    });
    standIn.current = created;
    return () => {
      created.destroy();
      standIn.current = null;
    };
  }, [understudy, sequence]);
  useEffect(() => {
    void progress;
    standIn.current?.sync();
  }, [progress]);

  const quality = state?.quality;
  const rung = state?.rung;
  // A renderer from an earlier WebGL rung is gone (or lost): wait for the new one.
  useEffect(() => {
    if (rung !== "webgl") {
      gl.current = null;
      setGlReady(false);
    }
  }, [rung]);
  return (
    <div className={shared.demo} data-demo="understudy">
      <div className={shared.split}>
        <div>
          <div className={styles.stage} style={{ aspectRatio: "16 / 10", height: "auto" }}>
            {understudy && (
              <Ladder
                state={state}
                webgl={
                  <Canvas
                    shadows="percentage"
                    gl={{ preserveDrawingBuffer: true }}
                    camera={{ fov: 32, position: [4.2, 3, 6.2] }}
                    onCreated={(s) => {
                      gl.current = s.gl;
                      setGlReady(true);
                    }}
                    aria-hidden="true"
                  >
                    <Governor understudy={understudy} frameTime={() => frameTime.current} />
                    <Scene
                      understudy={understudy}
                      progress={progressRef}
                      work={workRef}
                      spin={!reduced}
                    />
                  </Canvas>
                }
                sequence={null}
                poster={null}
              />
            )}
            <canvas
              ref={reelCanvas}
              data-testid="ud-reel"
              role="img"
              aria-label={`The jar, ${rung === "poster" ? "as a still poster" : "as an image sequence"}: the stand-in for the 3D scene`}
              style={{ display: rung && rung !== "webgl" ? "block" : "none" }}
            />
          </div>
          <p className={shared.caption}>
            Concept visual: a jar drawn in code. The sequence is the same jar, pre-rendered.
          </p>
        </div>
        <div className={shared.side}>
          <Readout
            label="Governor"
            rows={[
              ["Rung", rung ? RUNG_NAMES[rung] : "starting", "ud-rung"],
              ["Quality", state?.stepName ?? "", "ud-step"],
              ["Pixel ratio", quality ? `${quality.dpr}x` : "", "ud-dpr"],
              ["Shadows", quality?.shadows ? "on" : "off", "ud-shadows"],
              ["Post-processing", quality?.post ? "on" : "off", "ud-post"],
              [
                "Particles",
                quality ? Math.round(PARTICLES * quality.particles) : "",
                "ud-particles",
              ],
              ["Frame rate", state?.fps ? `${Math.round(state.fps)} fps` : "measuring", "ud-fps"],
              ["Display", state ? `${state.refresh} Hz` : "", "ud-refresh"],
            ]}
          />
          <Controls label="Load">
            <Segmented legend="Frame time" value={source} choices={SOURCES} onChange={setSource} />
            <Slider
              label="Simulated frame time"
              value={simulated}
              min={8}
              max={60}
              step={1}
              onChange={(v) => {
                setSource("simulated");
                setSimulated(v);
              }}
              format={(v) => `${v} ms (${Math.round(1000 / v)} fps)`}
            />
            <Slider
              label="Extra work per frame"
              value={work}
              min={0}
              max={40}
              step={1}
              onChange={setWork}
              format={(v) => `${v} ms`}
            />
          </Controls>
          <Controls label="Device">
            <Segmented legend="Device" value={device} choices={DEVICES} onChange={setDevice} />
            <Segmented legend="GPU tier" value={tier} choices={TIERS} onChange={setTier} />
            <div className={styles.chapterButtons}>
              <Button
                onClick={() =>
                  gl.current?.getContext().getExtension("WEBGL_lose_context")?.loseContext()
                }
                disabled={rung !== "webgl" || !glReady}
              >
                Lose the WebGL context
              </Button>
              <Button onClick={() => understudy?.retry()} disabled={rung === "webgl"}>
                Try WebGL again
              </Button>
            </div>
            <ReducedMotionToggle value={reduced} onChange={setReduced} />
          </Controls>
          <Slider
            label="Scene position"
            value={progress}
            min={0}
            max={1}
            step={0.01}
            onChange={setProgress}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </div>
      </div>
      <div className={shared.panel}>
        <h3 className={shared.panelTitle}>What changed, and why</h3>
        <ol className={shared.list} data-testid="ud-log" aria-live="polite">
          {state?.reasons.map((r, i) => (
            // Reasons repeat; their order is their identity.
            // biome-ignore lint/suspicious/noArrayIndexKey: an append-only log
            <li key={i}>{r}</li>
          ))}
        </ol>
        <Note>
          {reduced
            ? "Reduced motion is on: the governor shows the poster, and the particles stand still if you try WebGL again."
            : "Push the simulated frame time up: post-processing goes first, then pixel ratio, shadows and particles. At the bottom of the ladder, or on a lost context, the image sequence takes over at the same position."}
        </Note>
      </div>
      <Code>{`const [state, understudy] = useUnderstudy({ rungs: ["webgl", "sequence", "poster"] });

<Ladder state={state}
  webgl={<Canvas shadows><Governor understudy={understudy} /><Scene /></Canvas>}
  sequence={null} poster={null} />           // the stand-in draws on its own canvas
<canvas ref={reelCanvas} />

createStandIn(reelCanvas, manifest, { baseUrl, understudy, progress: () => scroll });
// In the scene: const { particles, post } = useQuality(understudy);`}</Code>
    </div>
  );
}

/** The jar, a hairline floor that takes shadows, a particle ring and an optional vignette pass. */
function Scene({
  understudy,
  progress,
  work,
  spin,
}: {
  understudy: Understudy;
  progress: { current: number };
  work: { current: number };
  spin: boolean;
}) {
  const quality = useQuality(understudy);
  const group = useRef<Group>(null);
  const ring = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(0, 0.9, 0);
  }, [camera]);
  useEffect(() => {
    group.current?.traverse((o) => {
      o.castShadow = true;
    });
  }, []);

  const geometry = useMemo(() => {
    const positions = new Float32Array(PARTICLES * 3);
    for (let i = 0; i < PARTICLES; i++) {
      // A deterministic ring: golden-angle spiral, so every run looks the same.
      const a = i * 2.39996;
      const r = 1.6 + ((i * 7919) % 1000) / 1000;
      positions.set([Math.cos(a) * r, 0.2 + ((i * 104729) % 1000) / 600, Math.sin(a) * r], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    geometry.setDrawRange(0, Math.round(PARTICLES * quality.particles));
  }, [geometry, quality.particles]);

  useFrame((_, delta) => {
    // Extra work stands in for a heavier scene: it slows real frames.
    const until = performance.now() + work.current;
    while (performance.now() < until) {
      /* busy */
    }
    if (group.current) group.current.rotation.y = progress.current * Math.PI * 2;
    if (ring.current && spin) ring.current.rotation.y += delta * 0.1;
  });

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[3, 6, 3]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#0b0c0c" roughness={0.9} />
      </mesh>
      <gridHelper args={[12, 24, "#3fbead", "#123a35"]} position={[0, 0.002, 0]} />
      <group ref={group}>
        <Jar3D />
      </group>
      <group ref={ring}>
        <points geometry={geometry}>
          <pointsMaterial color="#3fbead" size={0.025} sizeAttenuation />
        </points>
      </group>
      {quality.post && <Vignette />}
    </>
  );
}

/** A vignette pass through three's EffectComposer, taking over rendering while mounted. */
function Vignette() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.darkness = { value: 1.3 };
    vignette.uniforms.offset = { value: 0.9 };
    c.addPass(vignette);
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera]);
  useEffect(() => {
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
  }, [composer, size, dpr]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame(() => composer.render(), 1);
  return null;
}
