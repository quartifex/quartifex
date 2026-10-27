"use client";

// ink-dissolve (LB03, Lab). One still gives way to another through a noise threshold, with a
// thin edge of ink where the two meet, as if the second picture soaks through the first.
// Scroll inside the stage or drag the slider. Lab code: no API promises.
import { useEffect, useRef, useState } from "react";
import { Controls, Note, Readout, Segmented, Slider } from "@/components/demo/kit";
import { COVER, gyroFrame, jarFrame, NOISE } from "../gl";
import { Scroller } from "../Scroller";
import styles from "../seed.module.css";
import { useQuad } from "../useQuad";

const FRAG = `uniform sampler2D a;uniform sampler2D b;uniform vec2 res;uniform float t;uniform float scale;uniform float edge;uniform vec3 ink;uniform float seed;
${COVER}
${NOISE}
void main(){
  float va=res.x/res.y;
  vec2 uv=cover(vUv,va,16./9.);
  vec3 A=texture2D(a,uv).rgb,B=texture2D(b,uv).rgb;
  vec2 q=vUv*vec2(va,1.)*scale+seed;
  float n=fbm(q)*.75+fbm(q*3.1+4.)*.25;
  // the threshold runs a little past both ends so 0 and 1 are clean
  float th=mix(-edge-.02,1.+edge+.02,t);
  float m=smoothstep(th-.01,th+.01,n);
  float rim=smoothstep(th-edge,th,n)*(1.-smoothstep(th,th+.004,n));
  vec3 col=mix(B,A,m);
  col=mix(col,ink,clamp(rim*1.4,0.,1.));
  gl_FragColor=vec4(col,1.);
}`;

const INKS = {
  sindoor: { label: "Sindoor", rgb: [0.76, 0.27, 0.05] },
  ganga: { label: "Ganga", rgb: [0.2, 0.82, 0.75] },
  black: { label: "Black", rgb: [0.03, 0.03, 0.03] },
} as const;
type Ink = keyof typeof INKS;
const INK_CHOICES = (Object.keys(INKS) as Ink[]).map((value) => ({
  value,
  label: INKS[value].label,
}));

export default function InkDissolve() {
  const [t, setT] = useState(0.35);
  const [scale, setScale] = useState(2.4);
  const [edge, setEdge] = useState(0.05);
  const [ink, setInk] = useState<Ink>("sindoor");
  const [seed, setSeed] = useState(3.7);
  const scroller = useRef<HTMLDivElement>(null);
  const state = useRef({ t, scale, edge, ink, seed });
  state.current = { t, scale, edge, ink, seed };

  const { canvas, ready, failed, redraw } = useQuad(
    FRAG,
    [jarFrame(40), gyroFrame(40)],
    (q, tex, _time, res) => {
      const s = state.current;
      q.draw(
        { res, t: s.t, scale: s.scale, edge: s.edge, ink: INKS[s.ink].rgb, seed: s.seed },
        { a: tex[0] ?? null, b: tex[1] ?? null },
      );
    },
    false,
  );

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setT(max > 0 ? el.scrollTop / max : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: any changed value means a new frame
  useEffect(() => redraw(), [t, scale, edge, ink, seed, ready, redraw]);

  const move = (v: number) => {
    setT(v);
    const el = scroller.current;
    if (el) el.scrollTop = v * (el.scrollHeight - el.clientHeight);
  };

  return (
    <div className={styles.seed} data-demo="ink-dissolve">
      <Controls label="Dissolve">
        <Slider
          label="Reveal"
          value={t}
          min={0}
          max={1}
          step={0.005}
          onChange={move}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Grain of the ink"
          value={scale}
          min={0.8}
          max={6}
          step={0.1}
          onChange={setScale}
        />
        <Slider label="Edge" value={edge} min={0} max={0.15} step={0.005} onChange={setEdge} />
        <Segmented legend="Edge ink" value={ink} choices={INK_CHOICES} onChange={setInk} />
        <Slider label="Pattern" value={seed} min={0} max={20} step={0.1} onChange={setSeed} />
      </Controls>
      <div className={styles.stage}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          aria-label="One still dissolving into another"
        />
        <Scroller ref={scroller} label="Scroll to reveal the second still" testid="id-scroll">
          <div style={{ height: "300cqh" }} />
        </Scroller>
        <span className={styles.hint}>Scroll here</span>
        {failed ? <span className={styles.status}>WebGL is not available here</span> : null}
        {!ready && !failed ? <span className={styles.status}>Loading</span> : null}
      </div>
      <Readout label="Reveal" rows={[["Revealed", `${Math.round(t * 100)}%`, "id-t"]]} />
      <Note>
        A noise field is compared against a moving threshold: wherever the noise is below it, the
        second still shows, and a thin band just behind the threshold is inked. The reveal only
        moves when you scroll or drag, so it behaves the same with reduced motion on.
      </Note>
    </div>
  );
}
