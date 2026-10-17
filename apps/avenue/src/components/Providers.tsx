"use client";
// Smooth scroll and ScrollTrigger through spine (Lenis, refreshed only on settled layout
// changes via plumb), and the reduced-motion policy through stillness. Under reduced motion
// spine scrolls natively and stillness runs each effect's still version.
import { createPlumb } from "@quartifex/plumb";
import { SpineProvider } from "@quartifex/spine/react";
import { StillnessProvider, useStillness } from "@quartifex/stillness/react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { type ReactNode, useEffect, useState } from "react";
import { frame } from "@/stage/state";

gsap.registerPlugin(ScrollTrigger, Flip, SplitText);

function MotionBridge() {
  const { level } = useStillness();
  useEffect(() => {
    frame.reducedMotion = level !== "full";
    document.documentElement.dataset.motion = level;
  }, [level]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  // plumb listens to the window: create it only in the browser.
  const [plumb] = useState(() => (typeof window === "undefined" ? undefined : createPlumb()));
  const [reduced] = useState(
    () =>
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  return (
    <StillnessProvider>
      <MotionBridge />
      <SpineProvider
        gsap={gsap}
        ScrollTrigger={ScrollTrigger}
        Lenis={Lenis}
        {...(plumb ? { plumb } : {})}
        reducedMotion={reduced}
        lenis={{ lerp: 0.12, smoothWheel: true }}
      >
        {children}
      </SpineProvider>
    </StillnessProvider>
  );
}
