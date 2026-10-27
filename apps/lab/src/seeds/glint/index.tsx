"use client";

// glint (LB01, Lab). A sweep of light crosses a product as the page scrolls: one soft band
// and a thin hot edge, kept to the product's own surface by its brightness, so the backdrop
// never lights up. Scroll inside the stage, or drag the slider. Lab code: no API promises.
import { useEffect, useRef, useState } from "react";
import {
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Slider,
  Toggle,
  useReducedMotion,
} from "@/components/demo/kit";
import { COVER, gyroFrame } from "../gl";
import { Scroller } from "../Scroller";
import styles from "../seed.module.css";
import { useQuad } from "../useQuad";

const FRAG = `uniform sampler2D img;uniform vec2 res;uniform float pos;uniform float ang;uniform float width;uniform float power;uniform float showMask;
${COVER}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){
  float va=res.x/res.y;
  vec2 uv=cover(vUv,va,16./9.);
  vec3 c=texture2D(img,uv).rgb;
  float l=lum(c);
  float m=smoothstep(.06,.18,l);
  vec2 dir=vec2(cos(ang),sin(ang));
  vec2 q=(vUv-.5)*vec2(va,1.);
  float d=dot(q,dir)-mix(-1.4,1.4,pos);
  float band=exp(-pow(d/width,2.));
  float edge=exp(-pow((d-width*.55)/(width*.08),2.))*.8;
  vec3 light=vec3(1.,.95,.86)*(band*.7+edge*1.2)*power*m*(.5+l*1.5);
  vec3 col=c+light;
  col=mix(col,vec3(m),showMask*.85);
  gl_FragColor=vec4(col,1.);
}`;

export default function Glint() {
  const [pos, setPos] = useState(0.2);
  const [angle, setAngle] = useState(-28);
  const [width, setWidth] = useState(0.22);
  const [power, setPower] = useState(1);
  const [showMask, setShowMask] = useState(false);
  const [reduced, setReduced] = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const state = useRef({ pos, angle, width, power, showMask, reduced });
  state.current = { pos, angle, width, power, showMask, reduced };

  const { canvas, ready, failed, redraw } = useQuad(
    FRAG,
    [gyroFrame(30)],
    (q, tex, _t, size) => {
      const s = state.current;
      q.draw(
        {
          res: size,
          // reduced motion: the light rests on the product instead of travelling
          pos: s.reduced ? 0.5 : s.pos,
          ang: (s.angle * Math.PI) / 180,
          width: s.width,
          power: s.power,
          showMask: s.showMask ? 1 : 0,
        },
        { img: tex[0] ?? null },
      );
    },
    false,
  );

  // the page inside the stage drives the sweep
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setPos(max > 0 ? el.scrollTop / max : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: any changed value means a new frame
  useEffect(() => redraw(), [pos, angle, width, power, showMask, reduced, ready, redraw]);

  const move = (v: number) => {
    setPos(v);
    const el = scroller.current;
    if (el) el.scrollTop = v * (el.scrollHeight - el.clientHeight);
  };

  return (
    <div className={styles.seed} data-demo="glint">
      <Controls label="Light">
        <Slider
          label="Sweep"
          value={pos}
          min={0}
          max={1}
          step={0.005}
          onChange={move}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Angle"
          value={angle}
          min={-80}
          max={80}
          step={1}
          onChange={setAngle}
          format={(v) => `${v} deg`}
        />
        <Slider label="Width" value={width} min={0.06} max={0.5} step={0.01} onChange={setWidth} />
        <Slider label="Strength" value={power} min={0} max={2} step={0.05} onChange={setPower} />
        <Toggle label="Show the surface mask" checked={showMask} onChange={setShowMask} />
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
      </Controls>
      <div className={styles.stage}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          aria-label="A gyroscope with a light sweep across it"
        />
        <Scroller ref={scroller} label="Scroll to move the light" testid="gl-scroll">
          <div style={{ height: "320cqh" }} />
        </Scroller>
        <span className={styles.hint}>Scroll here</span>
        {failed ? <span className={styles.status}>WebGL is not available here</span> : null}
        {!ready && !failed ? <span className={styles.status}>Loading</span> : null}
      </div>
      <Readout
        label="Light"
        rows={[
          ["Sweep", `${Math.round((reduced ? 0.5 : pos) * 100)}%`, "gl-pos"],
          ["Driven by", reduced ? "Nothing: the light rests" : "Scroll in the stage"],
        ]}
      />
      <Note>
        The light only lands where the product is: the shader masks it by the picture&apos;s own
        brightness, so the backdrop stays dark without a hand-drawn matte. Turn on the mask to see
        it. A real page maps the sweep to the section&apos;s scroll progress.
        {reduced
          ? " Reduced motion is on: the light rests on the product and does not travel."
          : ""}
      </Note>
    </div>
  );
}
