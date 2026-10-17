import { describe, expect, it } from "vitest";
import { canPlay, initialSystem, MEDIA_BY_ID, reduce, type System } from "./system";

const run = (state: System, ...actions: Parameters<typeof reduce>[1][]) =>
  actions.reduce(reduce, state);

describe("driver lockout", () => {
  it("pauses video on the driver's screen when the car moves, and says why", () => {
    let s = run(initialSystem(), { type: "play", seat: "driver", id: "northbound" });
    expect(s.seats.driver.playing).toBe(true);
    s = run(s, { type: "moving", on: true });
    expect(s.seats.driver.playing).toBe(false);
    expect(s.notice.text).toMatch(/Video paused/);
  });

  it("refuses video and locked modules for the driver while moving, but not for passengers", () => {
    const s = run(initialSystem(), { type: "moving", on: true });
    const film = MEDIA_BY_ID.northbound;
    expect(film && canPlay(s, "driver", film)).toBe(false);
    expect(film && canPlay(s, "copilot", film)).toBe(true);
    const tried = run(s, { type: "open", seat: "driver", module: "settings" });
    expect(tried.seats.driver.module).not.toBe("settings");
    expect(
      run(s, { type: "open", seat: "rearLeft", module: "settings" }).seats.rearLeft.module,
    ).toBe("settings");
  });

  it("lets audio keep playing for the driver while moving", () => {
    const s = run(
      initialSystem(),
      { type: "moving", on: true },
      { type: "play", seat: "driver", id: "field-notes" },
    );
    expect(s.seats.driver.nowPlaying).toBe("field-notes");
    expect(s.seats.driver.playing).toBe(true);
  });
});

describe("sharing to another screen", () => {
  it("delivers to the target's inbox; the target accepts and it plays there", () => {
    let s = run(initialSystem(), {
      type: "share",
      from: "copilot",
      to: "rearRight",
      kind: "media",
      ref: "paper-lanterns",
      title: "Paper Lanterns",
    });
    const share = s.seats.rearRight.inbox[0];
    expect(share?.from).toBe("copilot");
    s = run(s, { type: "accept", seat: "rearRight", id: share?.id ?? "" });
    expect(s.seats.rearRight.nowPlaying).toBe("paper-lanterns");
    expect(s.seats.rearRight.inbox).toHaveLength(0);
  });

  it("never takes over a screen uninvited: declining leaves it as it was", () => {
    const before = initialSystem();
    let s = run(before, {
      type: "share",
      from: "driver",
      to: "rearLeft",
      kind: "media",
      ref: "northbound",
      title: "Northbound",
    });
    s = run(s, { type: "decline", seat: "rearLeft", id: s.seats.rearLeft.inbox[0]?.id ?? "" });
    expect(s.seats.rearLeft.nowPlaying).toBe(before.seats.rearLeft.nowPlaying);
  });
});

describe("SOS", () => {
  it("counts down five seconds, can be cancelled, and otherwise calls", () => {
    let s = run(initialSystem(), { type: "sos-start", seat: "rearLeft" });
    expect(s.sos).toMatchObject({ state: "counting", remaining: 5 });
    s = run(s, { type: "sos-tick" }, { type: "sos-cancel" });
    expect(s.sos.state).toBe("idle");
    s = run(
      s,
      { type: "sos-start", seat: "driver" },
      ...Array.from({ length: 5 }, () => ({ type: "sos-tick" }) as const),
    );
    expect(s.sos.state).toBe("calling");
  });
});

describe("climate", () => {
  it("keeps the rear zones together while synced", () => {
    const s = run(initialSystem(), { type: "temp", seat: "rearLeft", by: 1.5 });
    expect(s.zones.rearRight.temp).toBe(s.zones.rearLeft.temp);
    const apart = run(
      s,
      { type: "sync-rear", on: false },
      { type: "temp", seat: "rearLeft", by: -1 },
    );
    expect(apart.zones.rearRight.temp).not.toBe(apart.zones.rearLeft.temp);
  });
});
