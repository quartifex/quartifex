"use client";
import { useEffect } from "react";

/** Controls that get the pointer-following light; `data-fx` also marks the press-fill ones. */
const FX =
  "[data-fx],.chip,.seg button,.links a,.results a,.moremenu button,.menu a,.menu button,.tab,.setrow,.sfield,.field,.srch,.copybox";

function setXY(el: HTMLElement, e: PointerEvent, x: string, y: string) {
  const r = el.getBoundingClientRect();
  el.style.setProperty(x, `${e.clientX - r.left}px`);
  el.style.setProperty(y, `${e.clientY - r.top}px`);
}

function eachFx(target: EventTarget | null, fn: (el: HTMLElement) => void) {
  if (!(target instanceof Element)) return;
  let el = target.closest<HTMLElement>(FX);
  while (el) {
    fn(el);
    el = el.parentElement?.closest<HTMLElement>(FX) ?? null;
  }
}

function fxTarget(e: Event): HTMLElement | null {
  return e.target instanceof Element ? e.target.closest<HTMLElement>("[data-fx]") : null;
}

/**
 * One set of document listeners for the whole site: the soft light that follows the pointer
 * (--lx/--ly) and the fill that grows from where the pointer enters (--x/--y).
 */
export function PointerFx() {
  useEffect(() => {
    const over = (e: PointerEvent) =>
      eachFx(e.target, (el) => {
        if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
        setXY(el, e, "--lx", "--ly");
        if (el.hasAttribute("data-fx")) setXY(el, e, "--x", "--y");
      });
    const move = (e: PointerEvent) => eachFx(e.target, (el) => setXY(el, e, "--lx", "--ly"));
    const out = (e: PointerEvent) => {
      const el = fxTarget(e);
      if (!el || (e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) return;
      setXY(el, e, "--x", "--y");
    };
    const down = (e: PointerEvent) => {
      const el = fxTarget(e);
      if (!el) return;
      setXY(el, e, "--x", "--y");
      setXY(el, e, "--lx", "--ly");
      el.setAttribute("data-press", "");
    };
    const up = () => {
      for (const el of document.querySelectorAll("[data-press]")) {
        setTimeout(() => el.removeAttribute("data-press"), 140);
      }
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerout", out);
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
    };
  }, []);
  return null;
}
