"use client";
// The journey: the sticky 3D stage with the chapters over it, one screen each. Scroll drives the
// camera: how far the visitor is through a chapter is how far the camera is along its path, and
// the render loop eases it there, so it moves with their hand and stops when they stop. Words
// and panels animate in when a chapter becomes active and out when it leaves. Where two
// chapters' paths do not meet (leaving the cabin for the roof view, going back in) a short blink
// hides the cut; the opening chapters join up, so the way in has none. Under reduced motion the
// camera cuts to each chapter's final pose and nothing animates.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef } from "react";
import { dispatch } from "@/demo/store";
import { CHAPTER_BY_ID } from "@/stage/camera";
import { frame, stage } from "@/stage/state";

/** Two poses closer than this (metres) are one continuous path, with no blink between them. */
const JOINED = 0.35;

export function Journey({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = frame.reducedMotion;
    const stageEl = el.querySelector<HTMLElement>("[data-stage]") ?? el;
    const blink = { v: 0 };
    const setBlink = () => stageEl.style.setProperty("--blink", blink.v.toFixed(3));
    let current = "";
    let timers: number[] = [];
    const clearTimers = () => {
      for (const t of timers) window.clearTimeout(t);
      timers = [];
    };

    const activate = (id: string, section: HTMLElement) => {
      if (id === current) return;
      const before = CHAPTER_BY_ID[current];
      const next = CHAPTER_BY_ID[id];
      current = id;
      document.documentElement.dataset.chapter = id;
      for (const s of el.querySelectorAll<HTMLElement>("[data-chapter]"))
        s.toggleAttribute("data-active", s === section);
      stageEl.toggleAttribute("data-letterbox", id === "hero");
      document.documentElement.toggleAttribute("data-grab", !next?.inside);
      const gap =
        before && next
          ? Math.hypot(
              before.to.pos[0] - next.from.pos[0],
              before.to.pos[1] - next.from.pos[1],
              before.to.pos[2] - next.from.pos[2],
            )
          : 0;
      const crossing =
        Boolean(before) && Boolean(before?.inside) !== Boolean(next?.inside) && gap > JOINED;
      gsap.killTweensOf(blink);
      if (crossing && !reduced) {
        // Through the body: dip to black, cut the camera, then fade up while it travels.
        gsap
          .timeline()
          .to(blink, { v: 1, duration: 0.32, ease: "power2.in", onUpdate: setBlink })
          .add(() => {
            frame.chapter = id;
            frame.cut = true;
          })
          .to(blink, { v: 0, duration: 0.7, ease: "power2.out", onUpdate: setBlink }, "+=0.08");
      } else {
        blink.v = 0;
        setBlink();
        frame.chapter = id;
        if (reduced) frame.cut = true;
      }
      script(id, section);
    };

    // The moments a chapter acts out, timed rather than scrolled.
    const script = (id: string, section: HTMLElement) => {
      clearTimers();
      if (id === "driver") {
        section.setAttribute("data-moving", "false");
        dispatch({ type: "moving", on: false });
        timers.push(
          window.setTimeout(() => {
            section.setAttribute("data-moving", "true");
            dispatch({ type: "moving", on: true });
          }, 1700),
        );
      } else {
        dispatch({ type: "moving", on: true });
      }
      if (id === "sos") {
        let n = 5;
        const tick = () => {
          n -= 1;
          section.setAttribute("data-count", String(Math.max(1, n)));
          if (n > 1) timers.push(window.setTimeout(tick, 900));
        };
        section.setAttribute("data-count", "5");
        timers.push(window.setTimeout(tick, 1100));
      }
    };

    const ctx = gsap.context(() => {
      for (const section of el.querySelectorAll<HTMLElement>("[data-chapter]")) {
        const id = section.dataset.chapter ?? "hero";
        ScrollTrigger.create({
          trigger: section,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (self) => {
            if (self.isActive) activate(id, section);
          },
          // How far along the chapter's path; under reduced motion, always its end.
          onUpdate: (self) => {
            if (self.isActive && frame.chapter === id) frame.local = reduced ? 1 : self.progress;
          },
        });
      }
      // The demo takes the camera when its section is mostly on screen.
      const demoEl = el.querySelector("#demo");
      if (demoEl) {
        ScrollTrigger.create({
          trigger: demoEl,
          start: "top 45%",
          end: "bottom 30%",
          onToggle: (self) => stage.set({ demo: self.isActive }),
        });
      }
    }, el);

    // Start in the hero.
    const hero = el.querySelector<HTMLElement>("section[data-chapter=hero]");
    if (hero && window.scrollY < innerHeight * 0.5) activate("hero", hero);

    const t = window.setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      window.clearTimeout(t);
      clearTimers();
      gsap.killTweensOf(blink);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={root} className="journey" id="journey">
      {children}
    </div>
  );
}
