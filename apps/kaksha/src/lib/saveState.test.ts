import { beforeEach, describe, expect, it } from "vitest";
import { getSaveState, resetSaveState, retryFailed, storageProblem, tracked } from "./saveState";

describe("save state", () => {
  beforeEach(() => resetSaveState());

  it("reports a failed write, keeps it, and clears it once a retry succeeds", async () => {
    let fail = true;
    let writes = 0;
    const out = await tracked(async () => {
      if (fail) throw new DOMException("full", "QuotaExceededError");
      writes += 1;
      return "ok";
    });
    expect(out).toBeUndefined();
    expect(getSaveState()).toMatchObject({ failed: 1, problem: "quota", pending: 0 });

    expect(await retryFailed()).toBe(false);
    expect(getSaveState().failed).toBe(1);

    fail = false;
    expect(await retryFailed()).toBe(true);
    expect(writes).toBe(1);
    expect(getSaveState()).toMatchObject({ failed: 0, problem: null });
    expect(getSaveState().lastSaved).toBeGreaterThan(0);
  });

  it("sorts storage errors by what the teacher can do", () => {
    expect(storageProblem({ name: "AbortError", inner: { name: "QuotaExceededError" } })).toBe(
      "quota",
    );
    expect(storageProblem({ name: "OpenFailedError" })).toBe("blocked");
    expect(storageProblem(new Error("x"))).toBe("other");
  });
});
