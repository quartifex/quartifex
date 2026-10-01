import { BoxGeometry, Group, Mesh } from "three";
import { describe, expect, it } from "vitest";
import { bounds, explode, explosionVectors, moveOrder, type Part, partProgress } from "./index.js";
import { createExplosion } from "./three.js";

const JAR: Part[] = [
  { id: "lid", center: [0, 2, 0], depth: 0, label: "Lid" },
  { id: "body", center: [0, 0, 0], depth: 0, label: "Body" },
  { id: "base", center: [0, -1.5, 0], depth: 0 },
  { id: "seal", center: [0, 1.6, 0], depth: 1, label: "Seal" },
];

describe("explosionVectors", () => {
  it("pushes parts away from the centre in radial mode", () => {
    const { center } = bounds(JAR);
    const v = explosionVectors(JAR);
    const lid = v.get("lid") ?? [0, 0, 0];
    const base = v.get("base") ?? [0, 0, 0];
    expect(lid[1]).toBeGreaterThan(0);
    expect(base[1]).toBeLessThan(0);
    // Nested parts move half as far.
    const seal = v.get("seal") ?? [0, 0, 0];
    expect(Math.hypot(...seal)).toBeCloseTo(Math.hypot(...lid) / 2, 6);
    expect(center[1]).toBeCloseTo((2 + 0 - 1.5 + 1.6) / 4);
  });

  it("spreads parts evenly along an axis, in order", () => {
    const v = explosionVectors(JAR.slice(0, 3), { mode: "axis", axis: [0, 1, 0], distance: 2 });
    const ys = ["base", "body", "lid"].map((id) => v.get(id)?.[1] ?? 0);
    expect(ys[0]).toBeLessThan(ys[1] as number);
    expect(ys[1]).toBeLessThan(ys[2] as number);
    expect(ys[1]).toBeCloseTo(0, 6);
    expect((ys[2] as number) - (ys[1] as number)).toBeCloseTo(
      (ys[1] as number) - (ys[0] as number),
      6,
    );
  });

  it("uses an override when a part sets one", () => {
    const v = explosionVectors(
      [...JAR, { id: "label", center: [0.5, 0, 0], depth: 0, explode: [3, 0, 0] }],
      {
        distance: 2,
      },
    );
    expect(v.get("label")).toEqual([6, 0, 0]);
  });
});

describe("partProgress and order", () => {
  it("staggers parts so the first starts at 0 and the last ends at 1", () => {
    expect(partProgress(0, 0, 4, 1, "linear")).toBe(0);
    expect(partProgress(0.25, 0, 4, 1, "linear")).toBeCloseTo(1);
    expect(partProgress(0.25, 3, 4, 1, "linear")).toBe(0);
    expect(partProgress(1, 3, 4, 1, "linear")).toBe(1);
    expect(partProgress(0.5, 2, 4, 0, "linear")).toBe(0.5);
  });

  it("moves outer levels first, outermost first", () => {
    expect(moveOrder(JAR).map((p) => p.id)).toEqual(["base", "lid", "body", "seal"]);
  });
});

describe("explode", () => {
  it("returns zero offsets at 0, full vectors at 1, and labels once apart", () => {
    const start = explode(JAR, 0);
    for (const offset of start.offsets.values()) expect(Math.hypot(...offset)).toBe(0);
    expect(start.annotations.every((a) => !a.visible)).toBe(true);
    const end = explode(JAR, 1);
    expect(end.offsets.get("lid")).toEqual(explosionVectors(JAR).get("lid"));
    expect(end.annotations.map((a) => a.label).sort()).toEqual(["Body", "Lid", "Seal"]);
    expect(end.annotations.every((a) => a.visible)).toBe(true);
  });
});

describe("createExplosion (three.js)", () => {
  function model() {
    const root = new Group();
    const box = () => new BoxGeometry(1, 0.5, 1);
    const lid = new Mesh(box());
    lid.name = "lid";
    lid.position.set(0, 1, 0);
    lid.userData.label = "Lid";
    const body = new Mesh(box());
    body.name = "body";
    const base = new Mesh(box());
    base.name = "base";
    base.position.set(0, -1, 0);
    root.add(lid, body, base);
    return { root, lid, base };
  }

  it("reads parts from the hierarchy and moves them, then resets", () => {
    const { root, lid, base } = model();
    const explosion = createExplosion(root, { distance: 1, stagger: 0 });
    expect(explosion.parts.map((p) => p.id)).toEqual(["lid", "body", "base"]);
    expect(explosion.parts[0]?.label).toBe("Lid");
    const result = explosion.set(1);
    expect(lid.position.y).toBeGreaterThan(1.5);
    expect(base.position.y).toBeLessThan(-1.5);
    expect(result.annotations[0]?.visible).toBe(true);
    explosion.reset();
    expect(lid.position.y).toBe(1);
  });

  it("works inside a rotated, scaled assembly", () => {
    const { root, lid } = model();
    root.rotation.z = Math.PI / 2;
    root.scale.setScalar(2);
    const explosion = createExplosion(root, { stagger: 0 });
    explosion.set(1);
    // In the root's own space the lid still moves straight up.
    expect(lid.position.x).toBeCloseTo(0, 6);
    expect(lid.position.y).toBeGreaterThan(1.5);
  });
});
