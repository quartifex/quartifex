import { describe, expect, it } from "vitest";
import {
  evaluate,
  GROUPS,
  PROFILES,
  renderHtml,
  type Sheet,
  type Snapshot,
  selectProfiles,
  summarise,
} from "./index.js";

describe("profiles", () => {
  it("covers 30+ unique profiles across every group", () => {
    expect(PROFILES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(PROFILES.map((p) => p.name)).size).toBe(PROFILES.length);
    expect(PROFILES.every((p) => !p.name.includes(","))).toBe(true);
    for (const group of GROUPS)
      expect(
        PROFILES.some((p) => p.group === group),
        group,
      ).toBe(true);
  });

  it("spans tall phones to 32:9", () => {
    const aspects = PROFILES.map((p) => p.width / p.height);
    expect(Math.min(...aspects)).toBeLessThan(0.45);
    expect(Math.max(...aspects)).toBeGreaterThanOrEqual(32 / 9 - 0.01);
    expect(new Set(PROFILES.map((p) => p.dpr)).size).toBeGreaterThanOrEqual(4);
  });

  it("marks touch and mobile sensibly", () => {
    for (const p of PROFILES) {
      if (p.group === "desktop" || p.group === "laptop") expect(p.touch).toBe(false);
      if (p.group === "phone") expect(p.mobile && p.touch).toBe(true);
      if (p.group === "in-app") expect(p.userAgent).toBeTruthy();
    }
  });

  it("selects by group and by name, and rejects unknown names", () => {
    expect(selectProfiles(["ultrawide"]).map((p) => p.name)).toEqual([
      "Ultrawide 21:9",
      "Super ultrawide 32:9",
    ]);
    expect(
      selectProfiles(["iphone se", "phone"]).filter((p) => p.name === "iPhone SE"),
    ).toHaveLength(1);
    expect(selectProfiles()).toHaveLength(PROFILES.length);
    expect(() => selectProfiles(["watch"])).toThrow(/no profile or group/);
  });
});

const empty: Snapshot = {
  viewport: { width: 390, height: 844 },
  dpr: 3,
  subjects: [],
  texts: [],
  targets: [],
  canvases: [],
  layoutShift: 0,
};

describe("evaluate", () => {
  it("passes a clean screen", () => {
    expect(evaluate(empty)).toEqual([]);
  });

  it("flags a subject outside the frame and copy over it", () => {
    const flags = evaluate({
      ...empty,
      subjects: [
        { label: "scene", rect: { x: 300, y: 200, width: 200, height: 400 }, clipped: true },
      ],
      texts: [{ label: 'h1 "Title"', rect: { x: 20, y: 300, width: 350, height: 80 } }],
    });
    expect(flags.map((f) => f.kind).sort()).toEqual(["subject-outside-frame", "text-over-subject"]);
  });

  it("flags overlapping text but not nested boxes", () => {
    const a = { label: "p", rect: { x: 0, y: 0, width: 200, height: 40 } };
    const b = { label: "p", rect: { x: 0, y: 30, width: 200, height: 40 } };
    const inner = { label: "span", rect: { x: 10, y: 10, width: 50, height: 10 } };
    expect(evaluate({ ...empty, texts: [a, b] }).map((f) => f.kind)).toEqual(["text-overlap"]);
    expect(evaluate({ ...empty, texts: [a, inner] })).toEqual([]);
  });

  it("flags small tap targets, except links inside running text", () => {
    const small = { label: "button", rect: { x: 0, y: 0, width: 20, height: 20 }, inline: false };
    const inline = { label: "a", rect: { x: 0, y: 0, width: 30, height: 16 }, inline: true };
    const flags = evaluate({ ...empty, targets: [small, inline] });
    expect(flags).toHaveLength(1);
    expect(flags[0]?.message).toMatch(/20x20, under 24x24/);
    expect(evaluate({ ...empty, targets: [small] }, { minTarget: 16 })).toEqual([]);
  });

  it("flags canvases over the pixel budget or larger than the screen shows", () => {
    const rect = { x: 0, y: 0, width: 390, height: 844 };
    const fits = { label: "canvas", width: 1170, height: 2532, rect };
    const half = { x: 0, y: 0, width: 195, height: 422 };
    const oversized = { label: "canvas", width: 1170, height: 2532, rect: half };
    const huge = { label: "canvas", width: 7680, height: 4320, rect };
    expect(evaluate({ ...empty, canvases: [fits] })).toEqual([]);
    expect(evaluate({ ...empty, canvases: [oversized] })[0]?.message).toMatch(
      /more pixels than the screen/,
    );
    expect(evaluate({ ...empty, canvases: [huge] })[0]?.message).toMatch(/over the 8.3 MP budget/);
  });

  it("flags layout shift over the line", () => {
    expect(evaluate({ ...empty, layoutShift: 0.25 })[0]?.kind).toBe("layout-shift");
    expect(evaluate({ ...empty, layoutShift: 0.05 })).toEqual([]);
  });
});

describe("report", () => {
  const profile = PROFILES[0];
  if (!profile) throw new Error("no profiles");
  const sheet: Sheet = {
    url: "https://example.test/<scene>",
    createdAt: "2026-10-01T00:00:00.000Z",
    chapters: ["intro", "scrub"],
    rows: [
      {
        profile,
        cells: [
          {
            chapter: "intro",
            image: "iphone-se/intro.png",
            flags: [{ kind: "tap-target", message: 'button "<Buy>" is 20x20' }],
          },
          { chapter: "scrub", image: "", flags: [] },
        ],
      },
    ],
  };

  it("counts flags by kind", () => {
    expect(summarise(sheet)).toEqual({ "tap-target": 1 });
  });

  it("renders escaped, self-contained HTML with one row per profile", () => {
    const html = renderHtml(sheet);
    expect(html).toContain("&lt;scene&gt;");
    expect(html).toContain("&lt;Buy&gt;");
    expect(html).not.toContain("<Buy>");
    expect(html).toContain('src="iphone-se/intro.png"');
    expect(html).toContain("Chapter not found at this size");
    expect(html).not.toMatch(/<script|https?:\/\/(?!example\.test)/);
  });
});
