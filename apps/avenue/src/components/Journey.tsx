"use client";
// Ties the page's scroll to the stage: progress through the journey (hero to demo) drives the
// camera, the problem beat pins briefly, headlines split in, and the demo takes the camera
// when its section arrives. All of it through spine, so it is reverted cleanly; under reduced
// motion (stillness) nothing pins or splits, and the camera cuts between chapters.
import { useSpineScope } from "@quartifex/spine/react";
import { useStillness } from "@quartifex/stillness/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { type ReactNode, useRef } from "react";
import { frame, stage } from "@/stage/state";
import styles from "./Journey.module.css";

export function Journey({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const { level } = useStillness();
  const full = level === "full";

  useSpineScope(
    () => {
      const el = root.current;
      if (!el) return;
      const demo = el.querySelector<HTMLElement>("#demo");
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        endTrigger: demo ?? el,
        end: "top top",
        onUpdate: (self) => {
          frame.progress = self.progress;
          el.style.setProperty("--journey", self.progress.toFixed(4));
        },
        onRefresh: (self) => {
          frame.progress = self.progress;
        },
      });
      if (demo) {
        ScrollTrigger.create({
          trigger: demo,
          start: "top 55%",
          end: "bottom 30%",
          onToggle: (self) => stage.set({ demo: self.isActive }),
        });
      }
      // Beats: each piece of copy fades in and out around its moment.
      for (const beat of el.querySelectorAll<HTMLElement>("[data-beat]")) {
        if (!full) {
          gsap.set(beat, { autoAlpha: 1, y: 0 });
          continue;
        }
        gsap.fromTo(
          beat,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            ease: "power2.out",
            scrollTrigger: { trigger: beat, start: "top 85%", end: "top 55%", scrub: 0.6 },
          },
        );
      }
      if (!full) return;
      // The problem: one short pinned beat.
      const pin = el.querySelector<HTMLElement>("[data-pin]");
      if (pin)
        ScrollTrigger.create({
          trigger: pin,
          start: "top top",
          end: "+=70%",
          pin: true,
          pinSpacing: true,
        });
      // Headlines split into lines and rise in.
      for (const h of el.querySelectorAll<HTMLElement>("[data-split]")) {
        const split = SplitText.create(h, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
        });
        gsap.from(split.lines, {
          yPercent: 110,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.09,
          scrollTrigger: { trigger: h, start: "top 80%", once: true },
        });
      }
    },
    [full],
    root,
  );

  return (
    <div ref={root} className={styles.journey} id="journey">
      {children}
    </div>
  );
}
