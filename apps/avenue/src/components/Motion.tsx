"use client";
// The page's text and section motion, in one place. None of it is scrubbed: things play in
// when they arrive and play out when they leave.
// - Headlines ([data-split]) are split into words. In the chapters over the 3D stage the words
//   rise out of masked lines when the chapter becomes active and drop away when it leaves (CSS,
//   driven by data-active); elsewhere they rise once as they arrive.
// - Blocks ([data-reveal]) lift and sharpen as they enter the screen, and fade as they leave.
// - Day sections ([data-wipe]) open from an inset, rounded frame to the full page.
// Under reduced motion none of it runs and everything is simply there.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect } from "react";

export function Motion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.dataset.motionReady = "";
    const ctx = gsap.context(() => {
      for (const h of document.querySelectorAll<HTMLElement>("[data-split]")) {
        const split = SplitText.create(h, {
          type: "lines,words",
          mask: "lines",
          linesClass: "split-line",
          wordsClass: "split-word",
        });
        if (h.closest("[data-slide]")) {
          split.words.forEach((w, i) => {
            (w as HTMLElement).style.setProperty("--w", String(i));
          });
          continue;
        }
        gsap.from(split.words, {
          yPercent: 115,
          opacity: 0,
          filter: "blur(10px)",
          duration: 1.2,
          ease: "expo.out",
          stagger: 0.04,
          scrollTrigger: { trigger: h, start: "top 86%", toggleActions: "play none none reverse" },
          onComplete: () => gsap.set(split.words, { clearProps: "filter" }),
        });
      }

      for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
        gsap.fromTo(
          el,
          { y: 40, opacity: 0, filter: "blur(10px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1,
            ease: "expo.out",
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              end: "bottom 6%",
              toggleActions: "play reverse play reverse",
            },
          },
        );
      }

      for (const sec of document.querySelectorAll<HTMLElement>("[data-wipe]")) {
        gsap.fromTo(
          sec,
          { clipPath: "inset(5% 4% 0% 4% round 40px)" },
          {
            clipPath: "inset(0% 0% 0% 0% round 0px)",
            duration: 1.1,
            ease: "expo.inOut",
            scrollTrigger: {
              trigger: sec,
              start: "top 75%",
              toggleActions: "play none none reverse",
            },
          },
        );
      }
    });
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 700);
    return () => {
      window.clearTimeout(t);
      ctx.revert();
      delete root.dataset.motionReady;
    };
  }, []);
  return null;
}
