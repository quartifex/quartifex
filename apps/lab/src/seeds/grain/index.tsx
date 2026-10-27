"use client";

// grain (LB05, Lab). Film grain and a hairline vignette over a still: grain that sits in the
// mid-tones the way film's does, a soft fall-off to the corners, and a one-pixel rule just
// inside the frame. Lab code: no API promises.
import { useEffect, useRef, useState } from "react";
import {
  Controls,
  Note,
  ReducedMotionToggle,
  Segmented,
  Slider,
  Toggle,
  useReducedMotion,
} from "@/components/demo/kit";
import { COVER, gyroFrame, jarFrame } from "../gl";
import styles from "../seed.module.css";
import { useQuad } from "../useQuad";

const FRAG = `uniform sampler2D img;uniform vec2 res;uniform float time;uniform float amount;uniform float size;uniform float vig;uniform float rule;uniform float split;
${COVER}
float h(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){
  float va=res.x/res.y;
  vec2 uv=cover(vUv,va,16./9.);
  vec3 c=texture2D(img,uv).rgb;
  vec3 base=c;
  // grain: per-cell noise, two octaves, strongest in the mid-tones
  vec2 cell=floor(gl_FragCoord.xy/size);
  float f=floor(time*24.);
  float g=(h(vec3(cell,f))+h(vec3(cell*.5+7.,f))*.5)/1.5-.5;
  float l=lum(c);
  float mid=1.-pow(abs(l-.5)*2.,2.);
  c+=g*amount*(.35+.65*mid);
  // vignette: an oval fall-off to the corners
  vec2 q=(vUv-.5)*vec2(va,1.);
  c*=1.-vig*smoothstep(.35,1.1,length(q)*1.25);
  // hairline: a one-pixel rule inset from the frame
  vec2 px=gl_FragCoord.xy, r=res, inset=vec2(18.)*res.y/540.;
  float lx=min(abs(px.x-inset.x),abs(px.x-(r.x-inset.x)));
  float ly=min(abs(px.y-inset.y),abs(px.y-(r.y-inset.y)));
  bool inX=px.x>inset.x-1.&&px.x<r.x-inset.x+1.;
  bool inY=px.y>inset.y-1.&&px.y<r.y-inset.y+1.;
  float line=((lx<.75&&inY)||(ly<.75&&inX))?1.:0.;
  c=mix(c,vec3(.93,.92,.89),line*rule*.55);
  if(vUv.x<split) c=base;
  gl_FragColor=vec4(c,1.);
}`;

const STILLS = [
  { value: "gyro", label: "Gyroscope" },
  { value: "jar", label: "Jar" },
] as const;
type Still = (typeof STILLS)[number]["value"];

export default function Grain() {
  const [still, setStill] = useState<Still>("gyro");
  const [amount, setAmount] = useState(0.12);
  const [size, setSize] = useState(1.5);
  const [vig, setVig] = useState(0.45);
  const [rule, setRule] = useState(true);
  const [compare, setCompare] = useState(false);
  const [reduced, setReduced] = useReducedMotion();
  const state = useRef({ amount, size, vig, rule, compare, reduced });
  state.current = { amount, size, vig, rule, compare, reduced };

  const { canvas, ready, failed, redraw } = useQuad(
    FRAG,
    [still === "gyro" ? gyroFrame(36) : jarFrame(36)],
    (q, tex, t, res) => {
      const s = state.current;
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      q.draw(
        {
          res,
          // reduced motion: the grain holds still
          time: s.reduced ? 0 : t,
          amount: s.amount,
          size: Math.max(1, s.size * dpr),
          vig: s.vig,
          rule: s.rule ? 1 : 0,
          split: s.compare ? 0.5 : 0,
        },
        { img: tex[0] ?? null },
      );
    },
    !reduced,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: any changed value means a new frame
  useEffect(() => redraw(), [amount, size, vig, rule, compare, reduced, ready, redraw]);

  return (
    <div className={styles.seed} data-demo="grain">
      <Controls label="Grain">
        <Segmented legend="Still" value={still} choices={STILLS} onChange={setStill} />
        <Slider label="Grain" value={amount} min={0} max={0.35} step={0.005} onChange={setAmount} />
        <Slider
          label="Grain size"
          value={size}
          min={1}
          max={4}
          step={0.25}
          onChange={setSize}
          format={(v) => `${v} px`}
        />
        <Slider label="Vignette" value={vig} min={0} max={1} step={0.01} onChange={setVig} />
        <Toggle label="Hairline rule" checked={rule} onChange={setRule} />
        <Toggle label="Compare: left half untouched" checked={compare} onChange={setCompare} />
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
      </Controls>
      <div className={styles.stage}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          data-testid="gr-canvas"
          aria-label="A still with film grain and a vignette"
        />
        {failed ? <span className={styles.status}>WebGL is not available here</span> : null}
        {!ready && !failed ? <span className={styles.status}>Loading</span> : null}
      </div>
      <Note>
        Grain is drawn per screen pixel, not per image pixel, so it stays crisp at any size, and it
        is strongest in the mid-tones and lightest in the blacks and whites, as on film. Written in
        GLSL for this seed; the three.js TSL version belongs to the emulsion library.
        {reduced
          ? " Reduced motion is on: the grain is frozen."
          : " The grain refreshes 24 times a second."}
      </Note>
    </div>
  );
}
