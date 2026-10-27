"use client";

// Runs one shader seed: builds the quad, loads its images as textures, and draws on demand
// (when a value changes) or every frame while `animate` is on and the canvas is on screen.
import { useCallback, useEffect, useRef, useState } from "react";
import { createQuad, loadImage, type Quad } from "./gl";

export type Painter = (
  q: Quad,
  tex: (WebGLTexture | null)[],
  timeSec: number,
  size: [number, number],
) => void;

export function useQuad(
  frag: string,
  sources: readonly string[],
  paint: Painter,
  animate: boolean,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const quad = useRef<Quad | null>(null);
  const textures = useRef<(WebGLTexture | null)[]>([]);
  const painter = useRef(paint);
  painter.current = paint;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const raf = useRef(0);
  const visible = useRef(true);
  const start = useRef(performance.now());
  const key = sources.join("|");

  const count = sources.length;
  const frame = useCallback(() => {
    raf.current = 0;
    const q = quad.current;
    const el = canvas.current;
    if (!q || !el || textures.current.length < count) return;
    const size = q.resize(Math.min(globalThis.devicePixelRatio || 1, 2));
    painter.current(q, textures.current, (performance.now() - start.current) / 1000, size);
  }, [count]);

  const redraw = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(frame);
  }, [frame]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt only when the shader or the image set (key) changes
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let dead = false;
    try {
      quad.current = createQuad(el, frag);
    } catch {
      quad.current = null;
    }
    if (!quad.current) {
      setFailed(true);
      return;
    }
    const q = quad.current;
    Promise.all(sources.map(loadImage))
      .then((imgs) => {
        if (dead) return;
        textures.current = imgs.map((img) => q.texture(img));
        setReady(true);
        redraw();
      })
      .catch(() => !dead && setFailed(true));
    const io = new IntersectionObserver(([e]) => {
      visible.current = !!e?.isIntersecting;
    });
    io.observe(el);
    const ro = new ResizeObserver(() => redraw());
    ro.observe(el);
    return () => {
      dead = true;
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      q.dispose();
      quad.current = null;
      textures.current = [];
    };
  }, [frag, key]);

  useEffect(() => {
    if (!animate || !ready) return;
    let id = 0;
    const loop = () => {
      id = requestAnimationFrame(loop);
      if (visible.current) frame();
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [animate, ready, frame]);

  /** Swaps one texture's image (for sequences). */
  const replace = useCallback((index: number, img: TexImageSource) => {
    const q = quad.current;
    if (!q) return;
    textures.current[index] = q.texture(img, textures.current[index]);
  }, []);

  return { canvas, ready, failed, redraw, replace, quad };
}
