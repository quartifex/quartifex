"use client";
// The journey: the sticky 3D stage with the chapters scrolling over it. Each chapter section
// carries data-chapter; while it is on screen, scroll writes its id and progress (0 to 1) for
// the camera. Also here: the hero's letterbox lifting, the blink as the camera enters the car,
// headlines rising line by line, and the scripted moments the chapters describe (the driver's
// screen locking as the car moves). Under reduced motion the camera cuts between poses and
// headlines stand still.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef } from "react";
import { dispatch } from "@/demo/store";
import { frame, stage } from "@/stage/state";

export function Journey({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = frame.reducedMotion;
    const stageEl = el.querySelector<HTMLElement>("[data-stage]") ?? el;
    const ctx = gsap.context(() => {
      // Chapters: which one is on screen and how far through it we are.
      for (const section of el.querySelectorAll<HTMLElement>("[data-chapter]")) {
        const id = section.dataset.chapter ?? "hero";
        ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom bottom",
          onUpdate: (self) => {
            if (self.isActive) {
              frame.chapter = id;
              frame.local = self.progress;
            }
          },
          onToggle: (self) => {
            if (self.isActive) {
              frame.chapter = id;
              frame.local = self.progress;
              document.documentElement.dataset.chapter = id;
            }
          },
        });
      }

      // Hero: the letterbox lifts as you start to scroll.
      ScrollTrigger.create({
        trigger: el.querySelector("section[data-chapter=hero]"),
        start: "top top",
        end: "+=60%",
        onUpdate: (self) => stageEl.style.setProperty("--letterbox", String(1 - self.progress)),
        onLeave: () => stageEl.style.setProperty("--letterbox", "0"),
        onEnterBack: () => stageEl.style.setProperty("--letterbox", "1"),
      });
      stageEl.style.setProperty("--letterbox", window.scrollY < 10 ? "1" : "0");

      // The blink into the cabin: a short dip to black around the moment the camera passes
      // through the body (about 45% through the cabin chapter).
      ScrollTrigger.create({
        trigger: el.querySelector("section[data-chapter=cabin]"),
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => {
          const t = self.progress;
          const d = Math.abs(t - 0.45);
          const blink = reduced ? (t > 0.42 && t < 0.48 ? 1 : 0) : Math.max(0, 1 - d / 0.08);
          stageEl.style.setProperty("--blink", blink.toFixed(3));
        },
        onLeave: () => stageEl.style.setProperty("--blink", "0"),
        onLeaveBack: () => stageEl.style.setProperty("--blink", "0"),
      });

      // And a blink back into the cabin for the demo: dark at the very end of the SOS chapter
      // (the camera moves inside behind it), fading up as the demo arrives.
      ScrollTrigger.create({
        trigger: el.querySelector("section[data-chapter=sos]"),
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => {
          const t = Math.min(1, Math.max(0, (self.progress - 0.84) / 0.16));
          stageEl.style.setProperty("--blink", (reduced ? (t > 0.5 ? 1 : 0) : t * t).toFixed(3));
        },
        onLeaveBack: () => stageEl.style.setProperty("--blink", "0"),
      });
      ScrollTrigger.create({
        trigger: el.querySelector("section[data-chapter=demo]"),
        start: "top bottom",
        end: "top 50%",
        onUpdate: (self) => {
          const t = self.progress;
          stageEl.style.setProperty(
            "--blink",
            (reduced ? (t < 0.2 ? 1 : 0) : Math.max(0, 1 - t / 0.7)).toFixed(3),
          );
        },
        onLeave: () => stageEl.style.setProperty("--blink", "0"),
      });

      // A2: the car pulls away halfway through the driver chapter, and the screen locks.
      let wasMoving = true;
      ScrollTrigger.create({
        trigger: el.querySelector("section[data-chapter=driver]"),
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => {
          if (!self.isActive) return;
          const moving = self.progress > 0.45;
          if (moving === wasMoving) return;
          wasMoving = moving;
          el.querySelector("section[data-chapter=driver]")?.setAttribute(
            "data-moving",
            moving ? "true" : "false",
          );
          dispatch({ type: "moving", on: moving });
        },
        // Outside the chapter the car is moving again: that is the demo's default.
        onLeave: () => {
          wasMoving = true;
          dispatch({ type: "moving", on: true });
        },
        onLeaveBack: () => {
          wasMoving = true;
          dispatch({ type: "moving", on: true });
        },
      });

      // Step-in notes and parts that follow a chapter's progress, via CSS (--p).
      for (const section of el.querySelectorAll<HTMLElement>("[data-progress]")) {
        ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom bottom",
          onUpdate: (self) => section.style.setProperty("--p", self.progress.toFixed(4)),
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

    // Measure again once the stage, fonts and images have settled.
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      window.clearTimeout(t);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={root} className="journey" id="journey">
      {children}
    </div>
  );
}
