import { describe, expect, it, vi } from "vitest";
import { createStillness, levelFor, resolveLevel, type StillnessWindow } from "./index.js";

function fakeWindow(options: { reduced?: boolean; saveData?: boolean; stored?: string } = {}) {
  const listeners = new Set<() => void>();
  const store = new Map<string, string>(options.stored ? [["qx-motion", options.stored]] : []);
  const reduced = { matches: Boolean(options.reduced) };
  const win: StillnessWindow = {
    matchMedia: (query) =>
      query === "(prefers-reduced-motion: reduce)"
        ? {
            get matches() {
              return reduced.matches;
            },
            addEventListener: (_: "change", fn: () => void) => listeners.add(fn),
            removeEventListener: (_: "change", fn: () => void) => listeners.delete(fn),
          }
        : { matches: false },
    navigator: { connection: { saveData: Boolean(options.saveData) } },
    localStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
    },
  };
  return {
    win,
    store,
    setReduced(on: boolean) {
      reduced.matches = on;
      for (const fn of listeners) fn();
    },
  };
}

describe("levels", () => {
  it("resolves preferences against the system", () => {
    expect(resolveLevel("auto", false)).toBe("full");
    expect(resolveLevel("auto", true)).toBe("reduced");
    expect(resolveLevel("static", false)).toBe("static");
    expect(resolveLevel("full", true)).toBe("full");
  });

  it("runs heavy effects statically on Save-Data", () => {
    expect(levelFor("full", true, true)).toBe("static");
    expect(levelFor("full", false, true)).toBe("full");
    expect(levelFor("reduced", true, false)).toBe("reduced");
  });
});

describe("createStillness", () => {
  it("follows the system preference and switches running effects live", () => {
    const device = fakeWindow();
    const s = createStillness({ window: device.win });
    const log: string[] = [];
    const handle = s.effect({
      name: "parallax",
      full: () => {
        log.push("full on");
        return () => log.push("full off");
      },
      reduced: () => {
        log.push("reduced on");
      },
    });
    expect(s.level).toBe("full");
    expect(handle.running).toBe("full");
    device.setReduced(true);
    expect(s.level).toBe("reduced");
    expect(handle.running).toBe("reduced");
    expect(log).toEqual(["full on", "full off", "reduced on"]);
    handle.destroy();
    expect(s.effects()).toEqual([]);
  });

  it("lets the visitor pin a level, remembers it, and goes back to auto", () => {
    const device = fakeWindow({ reduced: true });
    const s = createStillness({ window: device.win });
    const seen = vi.fn();
    s.subscribe(seen);
    s.set("static");
    expect(s.level).toBe("static");
    expect(device.store.get("qx-motion")).toBe("static");
    expect(seen).toHaveBeenCalledWith("static");
    expect(createStillness({ window: device.win }).level).toBe("static");
    s.set("auto");
    expect(s.level).toBe("reduced");
    expect(s.systemLevel).toBe("reduced");
  });

  it("falls back to the static variant, and to nothing", () => {
    const s = createStillness({
      window: fakeWindow().win,
      preference: "reduced",
      storageKey: null,
    });
    const still = vi.fn();
    s.effect({ name: "fade", full: () => {}, static: still });
    expect(still).toHaveBeenCalledTimes(1);
    expect(() => s.effect({ name: "glint", full: () => {} })).not.toThrow();
    expect(s.effects().map((e) => e.running)).toEqual(["reduced", "reduced"]);
  });

  it("reads Save-Data and runs heavy effects statically", () => {
    const s = createStillness({ window: fakeWindow({ saveData: true }).win, storageKey: null });
    expect(s.saveData).toBe(true);
    const video = s.effect({ name: "hero video", heavy: true, full: () => {} });
    const fade = s.effect({ name: "fade", full: () => {} });
    expect(video.running).toBe("static");
    expect(fade.running).toBe("full");
    expect(s.effects()).toEqual([
      { name: "hero video", heavy: true, running: "static" },
      { name: "fade", heavy: false, running: "full" },
    ]);
  });

  it("ignores an invalid stored value and cleans up on destroy", () => {
    const device = fakeWindow({ stored: "wild" });
    const s = createStillness({ window: device.win });
    expect(s.preference).toBe("auto");
    const off = vi.fn();
    s.effect({ name: "x", full: () => off });
    s.destroy();
    expect(off).toHaveBeenCalled();
  });
});
