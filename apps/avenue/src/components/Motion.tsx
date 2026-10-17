"use client";
// The page's text and section motion, in one place:
// - headlines ([data-split]) rise word by word out of masked lines, sharpening from a blur;
// - blocks ([data-reveal]) lift and sharpen in small batches as they arrive;
// - Day sections open like a wipe, their rounded inset frame widening to the full page;
// - the hero's headline waits for the visitor to pass the gate, then plays.
// Under reduced motion none of it runs and everything is simply there.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect } from "react";
import { stage } from "@/stage/state";

export function Motion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.dataset.motionReady = "";
    const ctx = gsap.context(() => {
      const words = (h: HTMLElement) => {
        const split = SplitText.create(h, {
          type: "lines,words",
          mask: "lines",
          linesClass: "split-line",
          wordsClass: "split-word",
        });
        return split.words;
      };

      // Headlines.
      for (const h of document.querySelectorAll<HTMLElement>("[data-split]")) {
        const w = words(h);
        gsap.from(w, {
          yPercent: 115,
          opacity: 0,
          filter: "blur(10px)",
          duration: 1.25,
          ease: "expo.out",
          stagger: 0.045,
          scrollTrigger: { trigger: h, start: "top 86%", once: true },
          onComplete: () => gsap.set(w, { clearProps: "filter" }),
        });
      }

      // The hero's headline plays once the gate is passed.
      const hero = document.querySelector<HTMLElement>("[data-hero-split]");
      if (hero) {
        const w = words(hero);
        const rest = document.querySelectorAll<HTMLElement>("[data-hero-after]");
        gsap.set(w, { yPercent: 115, opacity: 0, filter: "blur(12px)" });
        gsap.set(rest, { opacity: 0, y: 18 });
        const play = () => {
          gsap
            .timeline({ delay: 0.15 })
            .to(w, {
              yPercent: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: 1.4,
              ease: "expo.out",
              stagger: 0.06,
            })
            .to(rest, { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.1 }, "-=0.9");
        };
        if (stage.get().entered) play();
        else {
          const off = stage.subscribe(() => {
            if (stage.get().entered) {
              off();
              play();
            }
          });
        }
      }

      // Blocks.
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 90%",
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { y: 42, opacity: 0, filter: "blur(10px)" },
            {
              y: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: 1.1,
              ease: "expo.out",
              stagger: 0.09,
              clearProps: "filter,transform",
            },
          ),
      });

      // Day sections: a wipe, from an inset rounded frame to the full width.
      for (const sec of document.querySelectorAll<HTMLElement>("[data-wipe]")) {
        gsap.fromTo(
          sec,
          { clipPath: "inset(6% 5% 0% 5% round 40px)" },
          {
            clipPath: "inset(0% 0% 0% 0% round 0px)",
            ease: "none",
            scrollTrigger: { trigger: sec, start: "top bottom", end: "top 25%", scrub: 0.6 },
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
