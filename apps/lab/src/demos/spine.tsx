"use client";

// Hub demo for @quartifex/spine, shown on /spine. While this page is open, spine runs the
// real thing on it: Lenis smooth scrolling driven by the one GSAP ticker, ScrollTrigger
// refreshed through plumb, and a pinned scene below. "Scene A / Scene B" are route changes
// (App Router query navigations): watch the old scene's pin come apart cleanly, the page go
// to the top, and one refresh logged.
import "lenis/dist/lenis.css";
import { createPlumb, type Plumb } from "@quartifex/plumb";
import type { SpineStats } from "@quartifex/spine";
import { SpineRouteSync } from "@quartifex/spine/next";
import { SpineProvider, useSpine, useSpineScope } from "@quartifex/spine/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Code,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Toggle,
  useReducedMotion,
} from "@/components/demo/kit";
import shared from "./demos.module.css";
import styles from "./spine.module.css";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

function Scene({ name, onProgress }: { name: string; onProgress: (p: number) => void }) {
  const section = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const report = useRef(onProgress);
  report.current = onProgress;
  useSpineScope(() => {
    if (!section.current || !panel.current) return;
    ScrollTrigger.create({
      id: `scene-${name}`,
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      pin: panel.current,
      onUpdate: (self) => report.current(self.progress),
    });
  }, [name]);
  return (
    <section
      ref={section}
      className={styles.scene}
      data-testid="sp-scene"
      data-chapter={`Scene ${name}`}
    >
      <div ref={panel} className={styles.panel}>
        <p className={styles.kicker}>Pinned scene</p>
        <h3 className={styles.title}>Scene {name.toUpperCase()}</h3>
        <p>Scroll on: this panel stays pinned while the section passes.</p>
      </div>
    </section>
  );
}

function Stats({ onStats }: { onStats: (s: SpineStats & { spacers: number }) => void }) {
  const spine = useSpine();
  useEffect(() => {
    if (!spine) return;
    const id = window.setInterval(
      () => onStats({ ...spine.stats(), spacers: document.querySelectorAll(".pin-spacer").length }),
      200,
    );
    return () => window.clearInterval(id);
  }, [spine, onStats]);
  return null;
}

export default function Demo() {
  const [plumb, setPlumb] = useState<Plumb | null>(null);
  const [smooth, setSmooth] = useState(true);
  const [reduced, setReduced] = useReducedMotion();
  const [stats, setStats] = useState<(SpineStats & { spacers: number }) | null>(null);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const scene = params.get("scene") === "b" ? "b" : "a";

  useEffect(() => {
    const p = createPlumb();
    setPlumb(p);
    return () => p.destroy();
  }, []);

  const go = (next: "a" | "b") => router.push(`${pathname}?scene=${next}`, { scroll: false });
  const native = reduced || !smooth;

  return (
    <div className={shared.demo} data-demo="spine">
      <Controls label="Spine">
        <Toggle
          label="Lenis smooth scroll"
          checked={smooth}
          onChange={setSmooth}
          disabled={reduced}
        />
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
        <Button onClick={() => go("a")} pressed={scene === "a"}>
          Scene A
        </Button>
        <Button onClick={() => go("b")} pressed={scene === "b"}>
          Scene B
        </Button>
      </Controls>

      {stats && (
        <Readout
          label="Spine"
          rows={[
            ["Scrolling", stats.lenis ? "Lenis" : "native", "sp-mode"],
            ["Ticker functions", stats.tickers, "sp-tickers"],
            ["ScrollTriggers", stats.triggers, "sp-triggers"],
            [
              "Pins",
              `${stats.pins} (${stats.spacers} spacer${stats.spacers === 1 ? "" : "s"} in the page)`,
              "sp-pins",
            ],
            ["Route", stats.route ?? "", "sp-route"],
            ["Scene progress", `${Math.round(progress * 100)}%`, "sp-progress"],
            [
              "Refreshes",
              stats.refreshes.map((r) => r.reason).join(", ") || "none",
              "sp-refreshes",
            ],
          ]}
        />
      )}
      <Note>
        {native
          ? "Native scrolling: reduced motion is on, or Lenis is switched off. ScrollTrigger still refreshes on real layout changes only."
          : "Lenis is smoothing this whole page now, driven by GSAP's ticker; ScrollTrigger hears every Lenis scroll."}{" "}
        Resize the window or rotate a phone and one refresh is logged; mobile toolbar movement logs
        nothing. Leave the tab for more than a second and come back: a "wake" refresh is logged.
      </Note>

      {plumb && (
        <SpineProvider
          key={native ? "native" : "lenis"}
          gsap={gsap}
          ScrollTrigger={ScrollTrigger}
          Lenis={Lenis}
          plumb={plumb}
          reducedMotion={native}
        >
          <SpineRouteSync search />
          <Stats onStats={setStats} />
          <Scene key={scene} name={scene} onProgress={setProgress} />
        </SpineProvider>
      )}

      <Code>{`// app/layout.tsx
<SpineProvider gsap={gsap} ScrollTrigger={ScrollTrigger} Lenis={Lenis} plumb={plumb}>
  <SpineRouteSync />
  {children}
</SpineProvider>

// any component
useSpineScope(() => {
  ScrollTrigger.create({ trigger: ref.current, pin: true, end: "+=200%" });
}, []);`}</Code>
    </div>
  );
}
