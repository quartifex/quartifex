"use client";
// Smooth scroll and scroll-driven motion: Lenis drives the scroll, GSAP's ticker drives Lenis,
// and ScrollTrigger updates on every Lenis scroll, so pinned scenes and the camera stay in step.
// Under reduced motion there is no Lenis (native scrolling) and `data-motion="reduced"` tells
// the CSS and the scenes to cut instead of move.
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import Snap from "lenis/snap";
import "lenis/dist/lenis.css";
import { type ReactNode, useEffect } from "react";
import { setLenis } from "@/lib/scroll";
import { frame } from "@/stage/state";

gsap.registerPlugin(ScrollTrigger, Flip, SplitText);

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let snap: Snap | null = null;
    let tick: ((time: number) => void) | null = null;

    const apply = () => {
      const reduced = query.matches;
      frame.reducedMotion = reduced;
      document.documentElement.dataset.motion = reduced ? "reduced" : "full";
      if (reduced && lenis) {
        snap?.destroy();
        snap = null;
        if (tick) gsap.ticker.remove(tick);
        lenis.destroy();
        lenis = null;
        setLenis(null);
      }
      if (!reduced && !lenis) {
        lenis = new Lenis({ lerp: 0.11, smoothWheel: true, syncTouch: false });
        lenis.on("scroll", ScrollTrigger.update);
        const l = lenis;
        tick = (time) => l.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        setLenis(lenis);
        // Each chapter and each section is a stop: scroll settles on the nearest start when it
        // ends close to one, so it is always clear where one part ends and the next begins.
        snap = new Snap(lenis, {
          type: "proximity",
          distanceThreshold: "38%",
          duration: 0.9,
          debounce: 140,
          easing: (t) => 1 - (1 - t) ** 3,
        });
        snap.addElements([...document.querySelectorAll<HTMLElement>("[data-snap]")], {
          align: ["start"],
          ignoreSticky: true,
        });
      }
      ScrollTrigger.refresh();
    };
    apply();
    query.addEventListener("change", apply);

    // Layout settles after fonts load: measure the pinned scenes again then.
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      query.removeEventListener("change", apply);
      if (tick) gsap.ticker.remove(tick);
      snap?.destroy();
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  return <>{children}</>;
}
