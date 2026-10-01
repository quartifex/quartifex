import { spawnSync } from "node:child_process";
import path from "node:path";
import { CatmullRomCurve3, PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  type CameraPath,
  catmullRom,
  chapters,
  createRig,
  damp,
  ease,
  parsePath,
  sample,
  type Vec3,
} from "./index.js";
import { applyToCamera, pathPoints } from "./three.js";

const PATH: CameraPath = {
  version: 1,
  keys: [
    { at: 0, position: [0, 1, 8], target: [0, 1, 0], fov: 35, chapter: "Intro" },
    { at: 0.4, position: [5, 2, 4], target: [0, 1, 0], ease: "inOut", chapter: "Orbit" },
    { at: 0.8, position: [0, 4, -6], target: [0, 0.5, 0], fov: 45 },
    { at: 1, position: [-3, 1.5, 2], target: [0, 1, 0], chapter: "Close" },
  ],
  buckets: { "tall-phone": { distance: 1.5 } },
};

describe("ease", () => {
  it("covers the named eases and cubic Béziers", () => {
    for (const kind of ["linear", "in", "out", "inOut"] as const) {
      expect(ease(kind, 0)).toBe(0);
      expect(ease(kind, 1)).toBe(1);
    }
    expect(ease("in", 0.5)).toBeLessThan(0.5);
    expect(ease("out", 0.5)).toBeGreaterThan(0.5);
    expect(ease([0.42, 0, 0.58, 1], 0.5)).toBeCloseTo(0.5, 3);
    expect(ease([0, 0, 1, 1], 0.3)).toBeCloseTo(0.3, 3);
  });
});

describe("catmullRom", () => {
  it("matches three's centripetal CatmullRomCurve3", () => {
    const points: Vec3[] = PATH.keys.map((k) => k.position);
    const curve = new CatmullRomCurve3(
      points.map((p) => new Vector3(...p)),
      false,
      "centripetal",
    );
    for (const u of [0, 0.1, 0.33, 0.5, 0.77, 1]) {
      const ours = catmullRom(points, u);
      const theirs = curve.getPoint(u);
      expect(ours[0]).toBeCloseTo(theirs.x, 6);
      expect(ours[1]).toBeCloseTo(theirs.y, 6);
      expect(ours[2]).toBeCloseTo(theirs.z, 6);
    }
  });
});

describe("parsePath", () => {
  it("accepts a valid path and rejects broken ones", () => {
    expect(parsePath(JSON.parse(JSON.stringify(PATH))).keys).toHaveLength(4);
    expect(() => parsePath({ version: 2, keys: [] })).toThrow(/version/);
    expect(() => parsePath({ version: 1, keys: [PATH.keys[0]] })).toThrow(/two keys/);
    expect(() => parsePath({ version: 1, keys: [PATH.keys[1], PATH.keys[0]] })).toThrow(/in order/);
    expect(() =>
      parsePath({
        version: 1,
        keys: [{ at: 0, position: [0, 0], target: [0, 0, 0] }, PATH.keys[1]],
      }),
    ).toThrow(/\[x, y, z\]/);
  });
});

describe("sample", () => {
  it("passes through every key and reports chapters and segments", () => {
    for (const key of PATH.keys) {
      const s = sample(PATH, key.at);
      expect(s.position[0]).toBeCloseTo(key.position[0], 6);
      expect(s.position[2]).toBeCloseTo(key.position[2], 6);
    }
    expect(sample(PATH, 0.2)).toMatchObject({ chapter: "Intro", segment: 0 });
    expect(sample(PATH, 0.5)).toMatchObject({ chapter: "Orbit", segment: 1 });
    expect(sample(PATH, 1).chapter).toBe("Close");
    expect(sample(PATH, 0.9).fov).toBeCloseTo(40, 6);
  });

  it("eases per segment", () => {
    const linear = { ...PATH, spline: "linear" as const };
    // Segment 1 eases inOut: a quarter of the way in time is less than a quarter in space.
    const quarter = sample(linear, 0.5);
    const expectedLinear = 5 + (0 - 5) * 0.25;
    expect(quarter.position[0]).toBeGreaterThan(expectedLinear);
  });

  it("dollies back per bucket", () => {
    const base = sample(PATH, 0);
    const phone = sample(PATH, 0, "tall-phone");
    expect(phone.position[2]).toBeCloseTo(
      base.target[2] + (base.position[2] - base.target[2]) * 1.5,
      6,
    );
  });

  it("lists chapters", () => {
    expect(chapters(PATH)).toEqual([
      { name: "Intro", at: 0 },
      { name: "Orbit", at: 0.4 },
      { name: "Close", at: 1 },
    ]);
  });
});

describe("createRig", () => {
  it("damps towards the goal, frame-rate independently", () => {
    const rig = createRig(PATH, { damping: 4, reducedMotion: false, compensate: false });
    rig.snap(0, 16 / 9);
    const one = createRig(PATH, { damping: 4, reducedMotion: false, compensate: false });
    one.snap(0, 16 / 9);
    rig.update(1, 0.5, 16 / 9);
    for (let i = 0; i < 10; i++) one.update(1, 0.05, 16 / 9);
    expect(rig.state.position[0]).toBeCloseTo(one.state.position[0], 6);
    expect(rig.state.position[2]).not.toBeCloseTo(-3, 1);
    expect(damp(0, 10, 4, 100)).toBeCloseTo(10);
  });

  it("holds chapter poses, undamped, under reduced motion", () => {
    const rig = createRig(PATH, { reducedMotion: true, compensate: false });
    const s = rig.update(0.7, 0.016, 16 / 9);
    // 0.7 is in the Orbit chapter, which starts at key 1.
    expect(s.position).toEqual(sample(PATH, 0.4).position);
    rig.setReducedMotion(false);
    expect(rig.update(0.7, 10, 16 / 9).position[1]).not.toEqual(s.position[1]);
  });

  it("widens the FOV on portrait screens", () => {
    const rig = createRig(PATH, { reducedMotion: true });
    expect(rig.snap(0, 16 / 9).fov).toBeCloseTo(35);
    expect(rig.snap(0, 9 / 19.5).fov).toBeGreaterThan(35);
  });
});

describe("three glue", () => {
  it("applies the state to a real PerspectiveCamera and samples the path", () => {
    const camera = new PerspectiveCamera(35, 1);
    const state = sample(PATH, 0.4);
    applyToCamera(camera, { ...state, fov: 50 });
    expect(camera.position.toArray()).toEqual(state.position);
    expect(camera.fov).toBe(50);
    const dir = camera.getWorldDirection(new Vector3());
    const expected = new Vector3(...state.target).sub(new Vector3(...state.position)).normalize();
    expect(dir.dot(expected)).toBeCloseTo(1, 5);
    expect(pathPoints((p) => sample(PATH, p), 8)).toHaveLength(9);
  });
});

describe("Blender exporter", () => {
  it("passes its own tests (when Python is available)", () => {
    const dir = path.join(import.meta.dirname, "..", "exporters", "blender");
    for (const python of ["python3", "python"]) {
      // Skip stand-ins that are not a real interpreter (e.g. the Windows Store alias).
      const version = spawnSync(python, ["--version"], { encoding: "utf8" });
      if (version.error || version.status !== 0 || !/^Python 3/.test(version.stdout)) continue;
      const run = spawnSync(python, ["test_dolly_export.py"], { cwd: dir, encoding: "utf8" });
      expect(run.status, run.stderr).toBe(0);
      return;
    }
  });
});
