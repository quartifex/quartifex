import { Box3, Mesh, type MeshPhysicalMaterial, Texture, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  type Band,
  decalPatch,
  dieline,
  dielinePoint,
  dielineSvg,
  FINISHES,
  labelAspect,
  radiusAt,
  sleeveGeometry,
} from "./index.js";
import { createLayerMaterial, createSleeve, createSleeveGeometry } from "./three.js";

const jar: Band = { radius: 40, height: 60, y: 10 };
const taper: Band = { radius: 40, radiusTop: 30, height: 60, y: 10 };

const vertex = (g: ReturnType<typeof sleeveGeometry>, i: number) => ({
  p: [g.positions[i * 3] ?? 0, g.positions[i * 3 + 1] ?? 0, g.positions[i * 3 + 2] ?? 0],
  n: [g.normals[i * 3] ?? 0, g.normals[i * 3 + 1] ?? 0, g.normals[i * 3 + 2] ?? 0],
  uv: [g.uvs[i * 2] ?? 0, g.uvs[i * 2 + 1] ?? 0],
});
const dist = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - (b[i] ?? 0)));

describe("sleeve geometry", () => {
  it("wraps a full sleeve around a cylinder with outward unit normals", () => {
    const g = sleeveGeometry(jar, { radialSegments: 90, lift: 0 });
    expect(g.positions.length / 3).toBe(91 * 2);
    expect(g.indices.length).toBe(90 * 6);
    for (let i = 0; i < g.positions.length / 3; i++) {
      const { p, n } = vertex(g, i);
      expect(Math.hypot(p[0] ?? 0, p[2] ?? 0)).toBeCloseTo(40, 4);
      expect(Math.hypot(...n)).toBeCloseTo(1, 5);
      // Outward: the normal points the same way as the radius.
      expect((n[0] ?? 0) * (p[0] ?? 0) + (n[2] ?? 0) * (p[2] ?? 0)).toBeGreaterThan(0);
    }
    expect(g.aspect).toBeCloseTo((2 * Math.PI * 40) / 60, 5);
  });

  it("centres the label opposite the seam", () => {
    // Seam at the back (180): the label's middle column faces +Z.
    const g = sleeveGeometry(jar, { coverage: 120, radialSegments: 2, lift: 0 });
    const middle = vertex(g, 1).p;
    expect(middle[0]).toBeCloseTo(0, 4);
    expect(middle[2]).toBeCloseTo(40, 4);
    // Seam at 270: the middle faces +X.
    const side = vertex(
      sleeveGeometry(jar, { coverage: 120, radialSegments: 2, seam: 270, lift: 0 }),
      1,
    ).p;
    expect(side[0]).toBeCloseTo(40, 4);
    // u runs left to right as seen from outside.
    expect(vertex(g, 0).uv[0]).toBe(0);
    expect(vertex(g, 0).p[0]).toBeLessThan(0);
  });

  it("is identical in both mappings on a straight cylinder", () => {
    const a = sleeveGeometry(jar, { mapping: "developed" });
    const b = sleeveGeometry(jar, { mapping: "stretch" });
    for (const [i, u] of a.uvs.entries()) expect(u).toBeCloseTo(b.uvs[i] ?? Number.NaN, 5);
  });

  it("maps a taper without distortion: UV distance is proportional to surface distance", () => {
    const g = sleeveGeometry(taper, { radialSegments: 60, heightSegments: 6, lift: 0 });
    const box = dieline(taper);
    const ratios: number[] = [];
    const cols = 61;
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < 60; i++) {
        const a = vertex(g, j * cols + i);
        // Along the label (one column) and up the slope (one row).
        for (const b of [vertex(g, j * cols + i + 1), vertex(g, (j + 1) * cols + i)]) {
          const flat = Math.hypot(
            ((a.uv[0] ?? 0) - (b.uv[0] ?? 0)) * box.width,
            ((a.uv[1] ?? 0) - (b.uv[1] ?? 0)) * box.height,
          );
          ratios.push(dist(a.p, b.p) / flat);
        }
      }
    }
    // Chords against arcs differ by under 0.1% at this resolution; stretch mapping is off by 30%.
    for (const r of ratios) expect(r).toBeCloseTo(1, 2);
    const stretch = sleeveGeometry(taper, { mapping: "stretch", radialSegments: 60, lift: 0 });
    const top = vertex(stretch, 61 + 30);
    const topNext = vertex(stretch, 61 + 31);
    const bottom = vertex(stretch, 30);
    const bottomNext = vertex(stretch, 31);
    // Same UV step, different surface length: the art squeezes at the narrow top.
    expect(dist(top.p, topNext.p) / dist(bottom.p, bottomNext.p)).toBeCloseTo(30 / 40, 2);
  });

  it("tilts the normals of a taper", () => {
    const g = sleeveGeometry(taper, { radialSegments: 8 });
    // Narrowing upwards: normals lean up.
    expect(vertex(g, 0).n[1]).toBeGreaterThan(0.1);
    const widening = sleeveGeometry(
      { radius: 30, radiusTop: 40, height: 60 },
      { radialSegments: 8 },
    );
    expect(vertex(widening, 0).n[1]).toBeLessThan(-0.1);
  });

  it("overlaps past 360 degrees, the outer end one stock thickness higher", () => {
    const g = sleeveGeometry(jar, { coverage: 370, radialSegments: 74, lift: 0, thickness: 0.01 });
    const first = vertex(g, 0).p;
    const last = vertex(g, 74).p;
    expect(Math.hypot(first[0] ?? 0, first[2] ?? 0)).toBeCloseTo(40, 4);
    expect(Math.hypot(last[0] ?? 0, last[2] ?? 0)).toBeCloseTo(40.4, 4);
  });

  it("lifts each layer one step further out", () => {
    const r = (layer: number) => {
      const { p } = vertex(sleeveGeometry(jar, { layer, radialSegments: 8 }), 0);
      return Math.hypot(p[0] ?? 0, p[2] ?? 0);
    };
    expect(r(0)).toBeCloseTo(40.08, 4);
    expect(r(2)).toBeCloseTo(40.24, 4);
  });

  it("rejects an empty band", () => {
    expect(() => sleeveGeometry({ radius: 0, height: 10 })).toThrow(/positive/);
  });
});

describe("die-line", () => {
  it("is a rectangle on a cylinder", () => {
    const d = dieline(jar, { coverage: 180 });
    expect(d.shape).toBe("rectangle");
    expect(d.width).toBeCloseTo(Math.PI * 40, 5);
    expect(d.height).toBeCloseTo(60, 5);
    // Bottom left first, in SVG's y-down space.
    expect(d.path).toBe("M0 60 L125.664 60 L125.664 0 L0 0 Z");
  });

  it("is a sector of an annulus on a taper, with the cone's geometry", () => {
    const d = dieline(taper);
    const slant = Math.hypot(60, 10);
    expect(d.shape).toBe("sector");
    expect(d.slant).toBeCloseTo(slant, 6);
    expect(d.outerRadius).toBeCloseTo((40 * slant) / 10, 4);
    expect((d.outerRadius ?? 0) - (d.innerRadius ?? 0)).toBeCloseTo(slant, 4);
    // Arc length of the outer edge equals the circumference at the wide end.
    expect((((d.angle ?? 0) * Math.PI) / 180) * (d.outerRadius ?? 0)).toBeCloseTo(
      2 * Math.PI * 40,
      3,
    );
    expect(d.path.match(/A/g)).toHaveLength(2);
    expect(labelAspect(taper)).toBeCloseTo(d.width / d.height, 6);
  });

  it("places label points on the die-line, matching its outline", () => {
    expect(dielinePoint(jar, {}, 0, 0)).toEqual([0, 60]);
    const d = dieline(taper);
    const [x, y] = dielinePoint(taper, {}, 0, 0);
    expect(d.path.startsWith(`M${Number(x.toFixed(3))} ${Number(y.toFixed(3))} `)).toBe(true);
    // The narrow top edge is shorter than the wide bottom one.
    const top = dist(dielinePoint(taper, {}, 0.5, 1), dielinePoint(taper, {}, 0.51, 1));
    const bottom = dist(dielinePoint(taper, {}, 0.5, 0), dielinePoint(taper, {}, 0.51, 0));
    expect(top / bottom).toBeCloseTo(0.75, 3);
  });

  it("writes a standalone SVG in the given unit", () => {
    const svg = dielineSvg(taper, {}, { unit: "mm" });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="[\d.]+mm"/);
    expect(svg).toContain("<title>Die-line: sector");
  });
});

describe("decals", () => {
  it("places a patch as wide and tall as the sticker, at its angle and height", () => {
    const patch = decalPatch(taper, { at: 90, y: 40, width: 20, height: 20 });
    expect(patch.options.seam).toBe(270);
    expect(patch.band.y).toBeLessThan(40);
    expect((patch.band.y ?? 0) + patch.band.height).toBeGreaterThan(40);
    const g = sleeveGeometry(patch.band, { ...patch.options, lift: 0 });
    const d = dieline(patch.band, patch.options);
    expect(d.slant).toBeCloseTo(20, 4);
    // Its middle faces +X.
    const mid = vertex(g, Math.floor(g.positions.length / 6 / 2)).p;
    expect(mid[0]).toBeGreaterThan(Math.abs(mid[2] ?? 0));
    expect(radiusAt(taper, 40)).toBeCloseTo(35, 6);
  });
});

describe("three binding", () => {
  it("builds one mesh per layer, decals above, with finishes", () => {
    const print = new Texture();
    const group = createSleeve(taper, {
      layers: [
        { map: print, finish: "gloss" },
        { mask: new Texture(), finish: "varnish" },
      ],
      decals: [{ at: 0, y: 40, width: 16, height: 16, layers: [{ finish: "foil" }] }],
    });
    const meshes = group.children.filter((c): c is Mesh => c instanceof Mesh);
    expect(meshes.map((m) => m.name)).toEqual(["label-0", "label-1", "decal-0-0"]);
    expect(meshes.map((m) => m.renderOrder)).toEqual([0, 1, 2]);
    const gloss = meshes[0]?.material as MeshPhysicalMaterial;
    expect(gloss.clearcoat).toBe(FINISHES.gloss.clearcoat);
    expect(print.colorSpace).toBe("srgb");
    const varnish = meshes[1]?.material as MeshPhysicalMaterial;
    expect(varnish.depthWrite).toBe(false);
    const foil = meshes[2]?.material as MeshPhysicalMaterial;
    expect(foil.metalness).toBe(1);
    const box = new Box3().setFromObject(group);
    expect(box.getSize(new Vector3()).y).toBeCloseTo(60, 1);
  });

  it("takes custom finish values over the satin default", () => {
    const m = createLayerMaterial({ finish: { roughness: 0.5 } });
    expect(m.roughness).toBe(0.5);
    expect(m.clearcoat).toBe(FINISHES.satin.clearcoat);
    expect(createSleeveGeometry(jar).getAttribute("uv").count).toBe(91 * 2);
  });
});
