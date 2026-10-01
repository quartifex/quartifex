import { describe, expect, it, vi } from "vitest";
import {
  chooseRung,
  createUnderstudy,
  defaultSteps,
  type Environment,
  qualityAt,
  type Understudy,
} from "./index.js";

const reels: Array<{
  options: { reducedMotion?: boolean };
  seek: ReturnType<typeof vi.fn>;
  setReducedMotion: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}> = [];
vi.mock("@quartifex/reel", () => ({
  createReel: (_canvas: unknown, _manifest: unknown, options: { reducedMotion?: boolean }) => {
    const reel = { options, seek: vi.fn(), setReducedMotion: vi.fn(), destroy: vi.fn() };
    reels.push(reel);
    return reel;
  },
}));

const ok: Environment = { webgl: true, gpuTier: 3, devicePixelRatio: 2 };

/** Feed `seconds` of frames, each `ms` long. */
function run(u: Understudy, ms: number, seconds: number) {
  for (let t = 0; t < seconds * 1000; t += ms) u.frame(ms);
}

describe("chooseRung", () => {
  it("starts on WebGL when the device can, and says why not when it cannot", () => {
    expect(chooseRung(ok)).toEqual({ rung: "webgl", reasons: ["WebGL is available"] });
    expect(chooseRung({ webgl: false })).toEqual({
      rung: "sequence",
      reasons: ["WebGL is not available"],
    });
    expect(chooseRung({ webgl: true, majorPerformanceCaveat: true }).rung).toBe("sequence");
    expect(chooseRung({ webgl: true, gpuTier: 0 }).reasons[0]).toMatch(/GPU tier 0/);
    expect(chooseRung({ ...ok, saveData: true })).toEqual({
      rung: "sequence",
      reasons: ["Save-Data is on"],
    });
    expect(chooseRung({ ...ok, effectiveType: "2g" }).rung).toBe("sequence");
  });

  it("follows the contract's reduced-motion and Save-Data policies", () => {
    expect(chooseRung({ ...ok, reducedMotion: true }).rung).toBe("poster");
    expect(chooseRung({ ...ok, reducedMotion: true }, { reducedMotion: "sequence" }).rung).toBe(
      "sequence",
    );
    expect(chooseRung({ ...ok, reducedMotion: true }, { reducedMotion: "keep" }).rung).toBe(
      "webgl",
    );
    expect(chooseRung({ ...ok, saveData: true }, { saveData: "keep" }).rung).toBe("webgl");
  });

  it("skips rungs the scene does not ship", () => {
    expect(chooseRung({ webgl: false }, { rungs: ["webgl", "poster"] }).rung).toBe("poster");
    expect(chooseRung(ok, { rungs: ["sequence", "poster"] }).rung).toBe("sequence");
  });
});

describe("the quality ladder", () => {
  it("applies every step down to the one asked for", () => {
    const steps = defaultSteps(2);
    expect(qualityAt(steps, 0)).toEqual({ dpr: 2, shadows: true, post: true, particles: 1 });
    expect(qualityAt(steps, 3)).toEqual({ dpr: 1.5, shadows: false, post: false, particles: 1 });
    expect(qualityAt(steps, 99)).toEqual({
      dpr: 0.75,
      shadows: false,
      post: false,
      particles: 0.25,
    });
    // Never above the device's ratio.
    expect(defaultSteps(1)[2]?.dpr).toBe(1);
  });

  it("starts lower on weaker GPUs", () => {
    expect(createUnderstudy(ok).state.stepName).toBe("Full");
    expect(createUnderstudy({ ...ok, gpuTier: 1 }).state.stepName).toBe("No shadows");
    const unknown = createUnderstudy({ webgl: true });
    expect(unknown.state.stepName).toBe("No post-processing");
    expect(unknown.state.reasons.at(-1)).toMatch(/GPU tier unknown/);
  });
});

describe("the governor", () => {
  it("holds steady at the display's rate", () => {
    const u = createUnderstudy(ok);
    run(u, 1000 / 60, 4);
    expect(u.state.step).toBe(0);
    expect(u.state.refresh).toBe(60);
    expect(Math.round(u.state.fps)).toBe(60);
  });

  it("steps down after two slow windows, then hands off to the sequence at the bottom", () => {
    const u = createUnderstudy(ok);
    const seen: string[] = [];
    u.subscribe((s) => seen.push(`${s.rung}:${s.step}`));
    // One warm-up window, then two slow ones: one step down.
    run(u, 40, 3.05);
    expect(u.state.step).toBe(1);
    expect(u.state.reasons.at(-1)).toBe('25 fps of 60 Hz: "No post-processing"');
    run(u, 40, 60);
    expect(u.state.rung).toBe("sequence");
    expect(u.state.reasons.at(-1)).toMatch(
      /^Still 25 fps at the lowest WebGL quality: handing off to the image sequence/,
    );
    expect(seen).toContain("webgl:6");
    // Off WebGL, frames are ignored and it never climbs back by itself.
    run(u, 1000 / 60, 20);
    expect(u.state.rung).toBe("sequence");
  });

  it("ignores stalls and sleeping tabs", () => {
    const u = createUnderstudy(ok);
    for (let i = 0; i < 20; i++) {
      run(u, 40, 0.9);
      u.frame(5000);
    }
    expect(u.state.step).toBe(0);
  });

  it("steps back up when frames recover, a limited number of times", () => {
    const u = createUnderstudy(ok);
    run(u, 40, 12);
    const low = u.state.step;
    expect(low).toBeGreaterThanOrEqual(3);
    run(u, 1000 / 60, 30);
    // Two recoveries at most, so a borderline scene cannot flap.
    expect(u.state.step).toBe(low - 2);
    expect(u.state.reasons.at(-1)).toMatch(/steady: back up to/);
  });

  it("judges against a 120 Hz display's own rate", () => {
    const u = createUnderstudy(ok);
    run(u, 1000 / 120, 2);
    expect(u.state.refresh).toBe(120);
    run(u, 1000 / 60, 3);
    expect(u.state.step).toBe(1);
    expect(u.state.reasons.at(-1)).toMatch(/60 fps of 120 Hz/);
  });

  it("demotes on context loss, and retries WebGL only when asked", () => {
    const u = createUnderstudy(ok);
    u.demote("The WebGL context was lost");
    expect(u.state.rung).toBe("sequence");
    u.demote("Frames failed to load");
    expect(u.state.rung).toBe("poster");
    u.retry();
    expect(u.state.rung).toBe("webgl");
    expect(u.state.reasons.at(-1)).toBe("Trying WebGL again");
  });

  it("goes to the poster under reduced motion, and back no higher than performance allows", () => {
    const u = createUnderstudy(ok);
    u.setReducedMotion(true);
    expect(u.state.rung).toBe("poster");
    u.setReducedMotion(false);
    expect(u.state.rung).toBe("webgl");
    u.demote("The WebGL context was lost");
    u.setReducedMotion(true);
    u.setReducedMotion(false);
    expect(u.state.rung).toBe("sequence");
  });

  it("can be told the refresh rate", () => {
    const u = createUnderstudy(ok, { fps: { refresh: 30 } });
    run(u, 1000 / 30, 4);
    expect(u.state.step).toBe(0);
  });
});

describe("the reel hand-off", () => {
  it("brings in a reel at the same position when WebGL steps aside, its poster on the last rung", async () => {
    const { createStandIn } = await import("./reel.js");
    reels.length = 0;
    const u = createUnderstudy(ok);
    let p = 0.4;
    const changes: Array<string> = [];
    const standIn = createStandIn({} as HTMLCanvasElement, {} as never, {
      baseUrl: "/seq/",
      understudy: u,
      progress: () => p,
      onChange: (reel, state) => changes.push(`${reel ? "reel" : "none"}:${state.rung}`),
    });
    expect(standIn.reel).toBeNull();
    u.demote("The WebGL context was lost");
    expect(reels).toHaveLength(1);
    expect(reels[0]?.options.reducedMotion).toBe(false);
    expect(reels[0]?.seek).toHaveBeenCalledWith(0.4);
    p = 0.7;
    standIn.sync();
    expect(reels[0]?.seek).toHaveBeenLastCalledWith(0.7);
    u.demote("Frames failed to load");
    expect(reels[0]?.setReducedMotion).toHaveBeenCalledWith(true);
    u.retry();
    expect(reels[0]?.destroy).toHaveBeenCalled();
    expect(changes).toEqual(["reel:sequence", "none:webgl"]);
    standIn.destroy();
  });
});
