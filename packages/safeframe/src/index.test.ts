import type { Plumb } from "@quartifex/plumb";
import { Box3, PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";
import {
  applyCamera,
  bucketFor,
  compensatedFov,
  createSafeframe,
  defineScene,
  drawFrame,
  fitCamera,
  frame,
  overlapArea,
  type Scene,
  sampleCamera,
} from "./index.js";

// A 1600x900 source with the subject off to the right: the case a centred crop gets
// wrong on a phone.
const scene: Scene = defineScene({
  width: 1600,
  height: 900,
  focal: { x: 0.7, y: 0.5 },
  subject: { x: 0.6, y: 0.2, width: 0.2, height: 0.6 },
  textZones: [
    { x: 0.05, y: 0.1, width: 0.4, height: 0.3 },
    { x: 0.05, y: 0.6, width: 0.4, height: 0.3 },
  ],
  buckets: {
    "tall-phone": {
      textZones: [
        { x: 0.05, y: 0.35, width: 0.9, height: 0.3 },
        { x: 0.05, y: 0.04, width: 0.9, height: 0.16 },
      ],
    },
  },
});

describe("bucketFor", () => {
  const cases: Array<[number, number, string]> = [
    [390, 844, "tall-phone"],
    [360, 640, "tall-phone"],
    [844, 390, "phone-landscape"],
    [768, 1024, "tablet"],
    [800, 800, "tablet"],
    [1280, 800, "laptop"],
    [1920, 1080, "desktop"],
    [2560, 1080, "ultrawide"],
    [3840, 1080, "ultrawide"],
  ];
  for (const [width, height, expected] of cases) {
    it(`puts ${width}x${height} in ${expected}`, () => {
      expect(bucketFor({ width, height })).toBe(expected);
    });
  }

  it("uses custom buckets in order", () => {
    const buckets = [
      { name: "narrow", test: (s: { width: number }) => s.width < 500 },
      { name: "wide", test: () => true },
    ];
    expect(bucketFor({ width: 400, height: 900 }, buckets)).toBe("narrow");
    expect(bucketFor({ width: 900, height: 400 }, buckets)).toBe("wide");
  });
});

describe("defineScene", () => {
  it("rejects values outside the frame", () => {
    expect(() => defineScene({ ...scene, focal: { x: 1.2, y: 0.5 } })).toThrow(/focal.x/);
    expect(() =>
      defineScene({ ...scene, subject: { x: 0.9, y: 0, width: 0.3, height: 0.5 } }),
    ).toThrow(/past the edge/);
    expect(() => defineScene({ ...scene, buckets: { laptop: { zoom: 0.5 } } })).toThrow(/zoom/);
    expect(() => defineScene({ ...scene, width: 0 })).toThrow(/positive/);
  });
});

describe("frame", () => {
  it("keeps an off-centre subject whole on a tall phone, where a centred crop cuts it", () => {
    const staged = frame(scene, { width: 390, height: 844 });
    expect(staged.bucket).toBe("tall-phone");
    expect(staged.subjectClipped).toBe(false);
    // A centred cover crop shows source x 800 +/- 208 = 592..1008: the subject (960..1280) is cut.
    const centred = frame(
      { ...scene, focal: { x: 0.5, y: 0.5 }, subject: { x: 0.5, y: 0.5, width: 0, height: 0 } },
      { width: 390, height: 844 },
    );
    expect(centred.region.x + centred.region.width).toBeLessThan(1280);
    expect(staged.region.x).toBeLessThanOrEqual(960);
    expect(staged.region.x + staged.region.width).toBeGreaterThanOrEqual(1280);
  });

  it("fills the viewport (cover) when the subject fits", () => {
    const staged = frame(scene, { width: 1920, height: 1080 });
    expect(staged.dest).toMatchObject({ x: 0, y: 0 });
    expect(staged.dest.width).toBeCloseTo(1920);
    expect(staged.dest.height).toBeCloseTo(1080);
    expect(staged.subjectClipped).toBe(false);
  });

  it("shows bars rather than cut the subject in 'subject' mode, and reports cuts in 'cover' mode", () => {
    const tall = { ...scene, subject: { x: 0.2, y: 0.05, width: 0.6, height: 0.9 } };
    const fitted = frame(tall, { width: 360, height: 800 });
    expect(fitted.subjectClipped).toBe(false);
    expect(fitted.dest.height).toBeLessThan(800);
    const covered = frame(tall, { width: 360, height: 800 }, { fit: "cover" });
    expect(covered.subjectClipped).toBe(true);
    expect(covered.dest.height).toBeCloseTo(800);
  });

  it("maps the focal point and subject into viewport pixels", () => {
    const staged = frame(scene, { width: 1600, height: 900 });
    expect(staged.scale).toBeCloseTo(1);
    expect(staged.focal.x).toBeCloseTo(1120);
    expect(staged.subject).toMatchObject({ x: 960, y: 180, width: 320, height: 540 });
  });

  it("picks the first text zone that clears the subject", () => {
    const phone = frame(scene, { width: 390, height: 844 });
    // The middle band overlaps the subject; the top band is clear.
    expect(phone.text?.y).toBeCloseTo(0.04 * 844);
    expect(phone.textOverlap).toBe(0);
    const laptop = frame(scene, { width: 1440, height: 900 });
    expect(laptop.text?.x).toBeCloseTo(0.05 * 1440);
    expect(laptop.textOverlap).toBe(0);
  });

  it("zooms past cover when a bucket asks for it", () => {
    const zoomed = { ...scene, buckets: { desktop: { zoom: 1.5 } } };
    expect(frame(zoomed, { width: 1920, height: 1080 }, { fit: "cover" }).scale).toBeCloseTo(1.8);
  });
});

describe("overlapArea", () => {
  it("measures intersections", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(overlapArea(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(25);
    expect(overlapArea(a, { x: 20, y: 0, width: 5, height: 5 })).toBe(0);
  });
});

describe("drawFrame", () => {
  it("draws the clipped source into the destination, scaled by DPR", () => {
    const ctx = { clearRect: vi.fn(), drawImage: vi.fn() };
    const staged = frame(scene, { width: 800, height: 450 });
    drawFrame(ctx, {} as CanvasImageSource, staged, 2);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1600, 900);
    const [, sx, sy, sw, sh, dx, dy, dw, dh] = ctx.drawImage.mock.calls[0] ?? [];
    expect([sx, sy, sw, sh]).toEqual([0, 0, 1600, 900]);
    expect([dx, dy, dw, dh]).toEqual([0, 0, 1600, 900]);
  });
});

describe("fitCamera", () => {
  const bounds = new Box3(new Vector3(-1, -0.5, -0.5), new Vector3(1, 1.5, 0.5));

  /** Project every corner through a real three.js camera and return the largest |NDC|. */
  function extent(aspect: number, options: Parameters<typeof fitCamera>[1]) {
    const camera = new PerspectiveCamera(35, aspect);
    applyCamera(camera, fitCamera(bounds, options));
    camera.updateMatrixWorld();
    let maxX = 0;
    let maxY = 0;
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          const p = new Vector3(x, y, z).project(camera);
          maxX = Math.max(maxX, Math.abs(p.x));
          maxY = Math.max(maxY, Math.abs(p.y));
        }
      }
    }
    return { maxX, maxY, camera };
  }

  for (const aspect of [9 / 19.5, 9 / 16, 1, 16 / 9, 32 / 9]) {
    it(`fits the subject inside the padded frame at aspect ${aspect.toFixed(2)}`, () => {
      const { maxX, maxY } = extent(aspect, { aspect, padding: 0.1 });
      expect(Math.max(maxX, maxY)).toBeLessThanOrEqual(0.8 + 1e-6);
      // Tight: one axis touches the padded edge.
      expect(Math.max(maxX, maxY)).toBeGreaterThan(0.79);
    });
  }

  it("fits from any direction", () => {
    const direction = { x: 1, y: 0.6, z: 0.8 };
    const { maxX, maxY } = extent(1.5, { aspect: 1.5, direction, padding: 0.05 });
    expect(Math.max(maxX, maxY)).toBeLessThanOrEqual(0.9 + 1e-6);
  });

  it("widens the field of view on portrait screens instead of backing far away", () => {
    const portrait = 9 / 19.5;
    expect(compensatedFov(35, 16 / 9)).toBe(35);
    expect(compensatedFov(35, portrait)).toBeGreaterThan(35);
    expect(compensatedFov(35, 0.1)).toBe(75);
    const plain = fitCamera(bounds, { aspect: portrait, compensate: false });
    const compensated = fitCamera(bounds, { aspect: portrait });
    expect(compensated.distance).toBeLessThan(plain.distance);
  });
});

describe("sampleCamera", () => {
  it("interpolates between keys and holds at the ends", () => {
    const keys = [
      { at: 0, padding: 0.2, fov: 30 },
      { at: 1, padding: 0.1, fov: 50 },
    ];
    const middle = sampleCamera(keys, 0.5);
    expect(middle.padding).toBeCloseTo(0.15);
    expect(middle.fov).toBeCloseTo(40);
    expect(sampleCamera(keys, -1).fov).toBe(30);
    expect(sampleCamera(keys, 2).fov).toBe(50);
    expect(sampleCamera([], 0.5)).toEqual({});
  });
});

describe("createSafeframe", () => {
  function fakeElement(width: number, height: number) {
    const props = new Map<string, string>();
    return {
      props,
      el: {
        clientWidth: width,
        clientHeight: height,
        dataset: {} as Record<string, string>,
        style: {
          setProperty: (name: string, value: string) => props.set(name, value),
          removeProperty: (name: string) => props.delete(name),
        },
      } as unknown as HTMLElement,
    };
  }

  it("stages the element, writes variables and attributes, and cleans up", () => {
    const { el, props } = fakeElement(390, 844);
    const onFrame = vi.fn();
    const instance = createSafeframe(el, scene, { onFrame });
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(el.dataset.sfBucket).toBe("tall-phone");
    expect(el.dataset.sfSubject?.split(" ")).toHaveLength(4);
    expect(props.get("--sf-text-y")).toBe(`${Math.round(0.04 * 844 * 100) / 100}px`);
    instance.destroy();
    expect(props.size).toBe(0);
    expect(el.dataset.sfBucket).toBeUndefined();
  });

  it("follows a plumb viewport when given one", () => {
    const { el } = fakeElement(10, 10);
    let listener: (() => void) | undefined;
    const viewport = {
      viewport: { width: 1920, height: 1080 },
      subscribe: (fn: () => void) => {
        listener = fn;
        return () => {
          listener = undefined;
        };
      },
    };
    const instance = createSafeframe(el, scene, {
      viewport: viewport as unknown as Plumb,
    });
    expect(instance.frame.bucket).toBe("desktop");
    viewport.viewport = { width: 390, height: 844 };
    listener?.();
    expect(instance.frame.bucket).toBe("tall-phone");
    instance.destroy();
    expect(listener).toBeUndefined();
  });
});
