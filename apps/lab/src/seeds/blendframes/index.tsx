"use client";

// blendframes (LB08, Lab; seed for inbetween). A scroll sequence ships only every Nth
// frame and a shader draws the frames in between: a straight cut, a crossfade, or a blend
// led by the image's own detail. Lab code: no API promises.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import { COVER, gyroFrame, loadImage } from "../gl";
import styles from "../seed.module.css";
import { useQuad } from "../useQuad";

const FRAG = `uniform sampler2D a;uniform sampler2D b;uniform float t;uniform float mode;uniform vec2 res;
${COVER}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){
  vec2 uv=cover(vUv,res.x/res.y,16./9.);
  vec4 A=texture2D(a,uv),B=texture2D(b,uv);
  float w=t;
  if(mode<.5){w=step(.5,t);}
  else if(mode>1.5){
    vec2 px=1.5/res;
    float e=abs(lum(texture2D(b,uv+vec2(px.x,0.)).rgb)-lum(texture2D(b,uv-vec2(px.x,0.)).rgb))
           +abs(lum(texture2D(b,uv+vec2(0.,px.y)).rgb)-lum(texture2D(b,uv-vec2(0.,px.y)).rgb));
    float d=clamp(lum(abs(B.rgb-A.rgb))*2.+e*3.,0.,1.);
    w=smoothstep(.45-d*.45,1.-d*.45,t);
  }
  gl_FragColor=vec4(mix(A.rgb,B.rgb,w),1.);
}`;

const MODES = [
  { value: "cut", label: "Cut" },
  { value: "fade", label: "Crossfade" },
  { value: "edge", label: "Detail-led" },
] as const;
const STEPS = [
  { value: "3", label: "Every 3rd" },
  { value: "6", label: "Every 6th" },
  { value: "12", label: "Every 12th" },
] as const;
type Mode = (typeof MODES)[number]["value"];
type Step = (typeof STEPS)[number]["value"];

/** Average size of one 960 px WebP frame of the gyro sequence, in kB. */
const FRAME_KB = 8.2;

export default function Blendframes() {
  const [mode, setMode] = useState<Mode>("edge");
  const [step, setStep] = useState<Step>("6");
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useReducedMotion();
  const [loaded, setLoaded] = useState(0);
  const n = Number(step);
  const last = Math.floor(71 / n);
  const keys = useMemo(() => Array.from({ length: last + 1 }, (_, i) => i * n), [n, last]);
  const images = useRef<Map<number, HTMLImageElement>>(new Map());
  const state = useRef({ frame, mode, n, last });
  state.current = { frame, mode, n, last };

  const { canvas, ready, failed, redraw, replace } = useQuad(
    FRAG,
    [gyroFrame(0), gyroFrame(6)],
    (q, tex, _t, size) => {
      const s = state.current;
      const k = Math.max(0, Math.min(Math.floor(s.frame / s.n), s.last - 1));
      const a = images.current.get(k * s.n);
      const b = images.current.get((k + 1) * s.n);
      if (a) replace(0, a);
      if (b) replace(1, b);
      const t = Math.min(1, Math.max(0, (s.frame - k * s.n) / s.n));
      q.draw(
        { t, mode: s.mode === "cut" ? 0 : s.mode === "fade" ? 1 : 2, res: size },
        { a: tex[0] ?? null, b: tex[1] ?? null },
      );
    },
    false,
  );

  // fetch only the keyframes, as a real page would
  useEffect(() => {
    let dead = false;
    setLoaded(keys.filter((i) => images.current.has(i)).length);
    for (const i of keys) {
      if (images.current.has(i)) continue;
      loadImage(gyroFrame(i)).then((img) => {
        if (dead) return;
        images.current.set(i, img);
        setLoaded((c) => c + 1);
        redraw();
      });
    }
    return () => {
      dead = true;
    };
  }, [keys, redraw]);

  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      setFrame((f) => (f + dt * 16) % 71);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: any changed value means a new frame
  useEffect(() => redraw(), [frame, mode, n, ready, redraw]);

  const word = n === 3 ? "third" : n === 6 ? "sixth" : "twelfth";
  return (
    <div className={styles.seed} data-demo="blendframes">
      <Controls label="Blend">
        <Segmented legend="In-between" value={mode} choices={MODES} onChange={setMode} />
        <Segmented legend="Frames shipped" value={step} choices={STEPS} onChange={setStep} />
        <Slider
          label="Frame"
          value={frame}
          min={0}
          max={71}
          step={0.1}
          onChange={(v) => {
            setPlaying(false);
            setFrame(v);
          }}
          format={(v) => `${v.toFixed(1)} / 71`}
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
      <div className={styles.stage}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          data-testid="bf-canvas"
          aria-label="The gyro sequence, blended between keyframes"
        />
        {failed ? <span className={styles.status}>WebGL is not available here</span> : null}
        {!ready && !failed ? <span className={styles.status}>Loading keyframes</span> : null}
      </div>
      <Readout
        label="What ships"
        rows={[
          ["Keyframes", `${loaded} of ${keys.length} loaded, 72 rendered`, "bf-keys"],
          [
            "Weight",
            `about ${Math.round(keys.length * FRAME_KB)} kB instead of ${Math.round(72 * FRAME_KB)} kB`,
          ],
          ["In-between", MODES.find((m) => m.value === mode)?.label ?? "", "bf-mode"],
        ]}
      />
      <Note>
        The gyro sequence was rendered at 72 frames. Only every {word} frame is fetched here and the
        shader draws the rest. Cut shows why a thinned sequence stutters, Crossfade smooths it, and
        Detail-led lets the parts of the picture that change most move first, so the blend reads as
        motion rather than a dissolve.
        {reduced ? " Reduced motion is on: Play is off; scrub with the slider." : ""}
      </Note>
    </div>
  );
}
