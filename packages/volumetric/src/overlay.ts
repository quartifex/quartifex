// The canvas variant of @quartifex/volumetric, published as `@quartifex/volumetric/overlay`:
// light shafts and lit dust drawn with Canvas 2D over anything (an image sequence, a static
// hero, a reel canvas). Shafts are drawn small and scaled up, which softens them like the
// WebGL pass's blur; dust shows only where a shaft lights it. Composite it with
// `mix-blend-mode: screen` so it only ever adds light.
import {
  beamAngles,
  dustField,
  kelvinToCss,
  lightAt,
  type Mote,
  moteAt,
  qualityFor,
  resolveSettings,
  type Settings,
  shaftLight,
  type VolumetricQuality,
} from "./index.js";

export type OverlayOptions = {
  settings?: Partial<Settings>;
  quality?: VolumetricQuality;
  /** Default: the visitor's `prefers-reduced-motion`. Draws one still frame. */
  reducedMotion?: boolean;
  /** Highest canvas pixel ratio. Default 1.5: the light is soft, extra pixels buy nothing. */
  maxDpr?: number;
  /** Seed for the beams and dust, so a page looks the same on every visit. */
  seed?: number;
};

export type Overlay = {
  update(settings: Partial<Settings>): void;
  setQuality(quality: VolumetricQuality): void;
  setReducedMotion(on: boolean): void;
  /** Draw one frame now (at a time in seconds, or the current one). */
  draw(seconds?: number): void;
  destroy(): void;
};

/** Below this share of the canvas, the shaft buffer is drawn: it is scaled up, which blurs it. */
const SHAFT_SCALE = 1 / 10;

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Start the overlay on a canvas. It animates while on screen and stops when it is not. */
export function createOverlay(canvas: HTMLCanvasElement, options: OverlayOptions = {}): Overlay {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("volumetric: no 2D context");
  const buffer = document.createElement("canvas");
  const bctx = buffer.getContext("2d");
  if (!bctx) throw new Error("volumetric: no 2D context");
  let settings = resolveSettings(options.settings);
  let reduced = options.reducedMotion ?? prefersReducedMotion();
  let quality = options.quality ?? qualityFor({ reducedMotion: reduced });
  const seed = options.seed ?? 7;
  let motes: Mote[] = dustField(quality.particles, seed);
  let raf = 0;
  let visible = true;
  const start = performance.now();

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, options.maxDpr ?? 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const bw = Math.max(1, Math.round(w * SHAFT_SCALE));
    const bh = Math.max(1, Math.round(h * SHAFT_SCALE));
    if (buffer.width !== bw || buffer.height !== bh) {
      buffer.width = bw;
      buffer.height = bh;
    }
    return { w, h, dpr };
  };

  const draw = (seconds = (performance.now() - start) / 1000) => {
    const { w, h, dpr } = size();
    const light = lightAt(settings, seconds, reduced || !quality.animate);
    const aspect = w / h;
    const beams = beamAngles(quality.beams, light.source, seed);
    const sx = light.source.x * buffer.width;
    const sy = light.source.y * buffer.height;
    const reach = (0.4 + settings.scatter * 1.6) * Math.hypot(buffer.width, buffer.height);
    const colour = (a: number) => kelvinToCss(settings.temperature, Math.max(0, Math.min(1, a)));

    // Shafts, small: a soft wedge per beam, brightest at the source.
    bctx.clearRect(0, 0, buffer.width, buffer.height);
    bctx.globalCompositeOperation = "lighter";
    for (const [i, angle] of beams.entries()) {
      const width = 0.045 + ((i * 37) % 7) * 0.008;
      const gradient = bctx.createLinearGradient(
        sx,
        sy,
        sx + Math.cos(angle) * reach,
        sy + Math.sin(angle) * reach,
      );
      // Uneven beams, as light through gaps is: some strong, most faint.
      const strength = 0.45 + (((i * 53) % 11) / 11) * 0.55;
      gradient.addColorStop(0, colour(light.density * 0.32 * strength));
      gradient.addColorStop(0.45, colour(light.density * 0.1 * strength));
      gradient.addColorStop(1, colour(0));
      bctx.fillStyle = gradient;
      bctx.beginPath();
      bctx.moveTo(sx, sy);
      bctx.lineTo(sx + Math.cos(angle - width) * reach, sy + Math.sin(angle - width) * reach);
      bctx.lineTo(sx + Math.cos(angle + width) * reach, sy + Math.sin(angle + width) * reach);
      bctx.closePath();
      bctx.fill();
    }
    const glow = bctx.createRadialGradient(sx, sy, 0, sx, sy, reach * 0.28);
    glow.addColorStop(0, colour(light.density * 0.32));
    glow.addColorStop(1, colour(0));
    bctx.fillStyle = glow;
    bctx.fillRect(0, 0, buffer.width, buffer.height);

    // Scaled up: the smoothing does the blur.
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(buffer, 0, 0, w, h);

    // Dust, lit only inside the shafts.
    if (settings.dust > 0) {
      ctx.globalCompositeOperation = "lighter";
      const shown = Math.round(motes.length * settings.dust);
      for (let i = 0; i < shown; i++) {
        const mote = motes[i] as Mote;
        const at = moteAt(mote, seconds, reduced || !quality.animate);
        const lit = shaftLight(
          at,
          light.source,
          { ...settings, density: light.density },
          beams,
          aspect,
        );
        if (lit < 0.03) continue;
        const twinkle = reduced ? 1 : 0.7 + 0.3 * Math.sin(seconds * 1.7 + mote.phase);
        ctx.fillStyle = colour(lit * twinkle);
        ctx.beginPath();
        ctx.arc(at.x * w, at.y * h, mote.size * (1 + (1 - mote.z) * 1.6) * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
  };

  const loop = () => {
    draw();
    raf = requestAnimationFrame(loop);
  };
  const run = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (visible && !reduced && quality.animate) raf = requestAnimationFrame(loop);
    else draw();
  };

  // Only spend frames while the overlay can be seen.
  const observer =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => {
          visible = entry?.isIntersecting ?? true;
          run();
        })
      : null;
  observer?.observe(canvas);
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
  resize?.observe(canvas);
  run();

  return {
    update(next) {
      settings = resolveSettings({
        ...settings,
        ...next,
        source: { ...settings.source, ...next.source },
      });
      if (!raf) draw();
    },
    setQuality(next) {
      quality = next;
      motes = dustField(quality.particles, seed);
      run();
    },
    setReducedMotion(on) {
      reduced = on;
      run();
    },
    draw,
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      observer?.disconnect();
      resize?.disconnect();
    },
  };
}
