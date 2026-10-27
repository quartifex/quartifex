"use client";

// halftone (LB02, Lab). A post-process that turns any frame into print: an ordered
// (Bayer) dither, a rotated dot screen, or a line screen, inked in the brand's colours.
// Lab code: no API promises.
import { useEffect, useRef, useState } from "react";
import { Controls, Note, Segmented, Slider, Toggle } from "@/components/demo/kit";
import { COVER, gyroFrame, jarFrame } from "../gl";
import styles from "../seed.module.css";
import { useQuad } from "../useQuad";

const FRAG = `uniform sampler2D img;uniform vec2 res;uniform float mode;uniform float cell;uniform float ang;uniform vec3 ink;uniform vec3 paper;uniform float contrast;uniform float split;
${COVER}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
float bayer4(vec2 p){
  vec2 q=mod(p,4.);
  float x=q.x,y=q.y;
  float v=mod(x,2.)*2.+mod(y,2.)*3.-mod(x,2.)*mod(y,2.)*4.;
  v=v*4.+(floor(x/2.)*2.+floor(y/2.)*3.-floor(x/2.)*floor(y/2.)*4.);
  return (v+.5)/16.;
}
void main(){
  float va=res.x/res.y;
  vec2 uv=cover(vUv,va,16./9.);
  vec3 src=texture2D(img,uv).rgb;
  vec2 px=gl_FragCoord.xy;
  float on;
  if(mode<.5){
    vec2 c=floor(px/cell);
    vec2 cuv=cover((c*cell+cell*.5)/res,va,16./9.);
    float l=clamp((lum(texture2D(img,cuv).rgb)-.5)*contrast+.5,0.,1.);
    on=step(bayer4(c),l);
  } else {
    float s=sin(ang),co=cos(ang);
    mat2 r=mat2(co,-s,s,co);
    vec2 p=r*px;
    vec2 c=floor(p/cell)*cell+cell*.5;
    vec2 centre=mat2(co,s,-s,co)*c;
    vec2 cuv=cover(centre/res,va,16./9.);
    float l=clamp((lum(texture2D(img,cuv).rgb)-.5)*contrast+.5,0.,1.);
        float aa=1.5/cell;
    if(mode<1.5){
      // paper outside a dot whose area follows the darkness
      float d=length(p-c)/(cell*.5);
      on=1.-smoothstep(sqrt(l)*1.13-aa,sqrt(l)*1.13+aa,d);
    } else {
      float d=abs(p.y-c.y)/(cell*.5);
      on=1.-smoothstep(l-aa,l+aa,d);
    }
  }
  vec3 col=mix(ink,paper,on);
  if(vUv.x<split) col=src;
  gl_FragColor=vec4(col,1.);
}`;

const MODES = [
  { value: "dither", label: "Dither" },
  { value: "dots", label: "Dot screen" },
  { value: "lines", label: "Line screen" },
] as const;
const PALETTES = {
  ganga: { label: "Ganga", ink: [0.02, 0.09, 0.08], paper: [0.2, 0.82, 0.75] },
  sindoor: { label: "Sindoor", ink: [0.11, 0.03, 0.02], paper: [0.95, 0.43, 0.29] },
  paper: { label: "Ink on paper", ink: [0.07, 0.07, 0.07], paper: [0.93, 0.92, 0.88] },
} as const;
type Palette = keyof typeof PALETTES;
const PALETTE_CHOICES = (Object.keys(PALETTES) as Palette[]).map((value) => ({
  value,
  label: PALETTES[value].label,
}));
const STILLS = [
  { value: "gyro", label: "Gyroscope" },
  { value: "jar", label: "Jar" },
] as const;
type Mode = (typeof MODES)[number]["value"];
type Still = (typeof STILLS)[number]["value"];

export default function Halftone() {
  const [mode, setMode] = useState<Mode>("dots");
  const [palette, setPalette] = useState<Palette>("ganga");
  const [still, setStill] = useState<Still>("gyro");
  const [cell, setCell] = useState(7);
  const [angle, setAngle] = useState(45);
  const [contrast, setContrast] = useState(1.3);
  const [compare, setCompare] = useState(false);
  const state = useRef({ mode, palette, cell, angle, contrast, compare });
  state.current = { mode, palette, cell, angle, contrast, compare };

  const { canvas, ready, failed, redraw } = useQuad(
    FRAG,
    [still === "gyro" ? gyroFrame(20) : jarFrame(20)],
    (q, tex, _t, res) => {
      const s = state.current;
      const p = PALETTES[s.palette];
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      q.draw(
        {
          res,
          mode: s.mode === "dither" ? 0 : s.mode === "dots" ? 1 : 2,
          cell: s.mode === "dither" ? Math.max(1, Math.round((s.cell / 3) * dpr)) : s.cell * dpr,
          ang: (s.angle * Math.PI) / 180,
          ink: p.ink,
          paper: p.paper,
          contrast: s.contrast,
          split: s.compare ? 0.5 : 0,
        },
        { img: tex[0] ?? null },
      );
    },
    false,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: any changed value means a new frame
  useEffect(() => redraw(), [mode, palette, cell, angle, contrast, compare, ready, redraw]);

  return (
    <div className={styles.seed} data-demo="halftone">
      <Controls label="Screen">
        <Segmented legend="Screen" value={mode} choices={MODES} onChange={setMode} />
        <Segmented legend="Inks" value={palette} choices={PALETTE_CHOICES} onChange={setPalette} />
        <Segmented legend="Still" value={still} choices={STILLS} onChange={setStill} />
        <Slider
          label="Cell"
          value={cell}
          min={3}
          max={18}
          step={1}
          onChange={setCell}
          format={(v) => `${v} px`}
        />
        <Slider
          label="Screen angle"
          value={angle}
          min={0}
          max={90}
          step={1}
          onChange={setAngle}
          format={(v) => `${v} deg`}
        />
        <Slider
          label="Contrast"
          value={contrast}
          min={0.6}
          max={2.4}
          step={0.05}
          onChange={setContrast}
        />
        <Toggle label="Compare: left half untouched" checked={compare} onChange={setCompare} />
      </Controls>
      <div className={styles.stage} data-testid="ht-stage" data-mode={mode}>
        <canvas ref={canvas} className={styles.canvas} aria-label="A frame printed as a halftone" />
        {failed ? <span className={styles.status}>WebGL is not available here</span> : null}
        {!ready && !failed ? <span className={styles.status}>Loading</span> : null}
      </div>
      <Note>
        Each screen cell samples the picture once, at its centre, then prints a dot, a line or a
        dither pattern sized by how bright that sample is. Cells are measured in screen pixels, so
        the print stays crisp on any display. Still by design: nothing moves, so there is nothing to
        stop under reduced motion.
      </Note>
    </div>
  );
}
