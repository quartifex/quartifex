import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readAudit } from "./audit";
import { CHAPTERS, linkedPreference, MOTION_SCRIPT, STORAGE_KEY } from "./motion";

const app = path.join(import.meta.dirname, "..", "..");

/** Run the pre-paint script against a fake page and return the level it chose. */
function levelFor(options: { search?: string; stored?: string | null; reduce?: boolean }) {
  const root = { dataset: {} as Record<string, string> };
  const run = new Function("location", "localStorage", "matchMedia", "document", MOTION_SCRIPT);
  run(
    { search: options.search ?? "" },
    { getItem: (key: string) => (key === STORAGE_KEY ? (options.stored ?? null) : null) },
    () => ({ matches: Boolean(options.reduce) }),
    { documentElement: root },
  );
  return root.dataset.motion;
}

describe("halcyon", () => {
  it("picks the level before first paint: link, then remembered choice, then system", () => {
    expect(levelFor({})).toBe("full");
    expect(levelFor({ reduce: true })).toBe("reduced");
    expect(levelFor({ stored: "static", reduce: true })).toBe("static");
    expect(levelFor({ stored: "auto", reduce: true })).toBe("reduced");
    expect(levelFor({ search: "?motion=reduced", stored: "static" })).toBe("reduced");
    expect(levelFor({ search: "?motion=wild", stored: "full", reduce: true })).toBe("full");
  });

  it("reads a level from a link, and nothing else", () => {
    expect(linkedPreference("?motion=static")).toBe("static");
    expect(linkedPreference("?motion=auto")).toBeUndefined();
    expect(linkedPreference("")).toBeUndefined();
  });

  it("names a chapter for every section the rail links to", () => {
    const page = readFileSync(path.join(app, "src", "components", "Hero.tsx"), "utf8");
    expect(page).toContain('id="dawn"');
    expect(CHAPTERS.map((c) => c.id)).toEqual(["dawn", "sunrise", "object", "quiet", "proof"]);
  });

  it("has an audit for every level, with no axe violations", () => {
    const audit = readAudit(path.join(app, "..", "..", "reports", "halcyon", "audit.json"));
    expect(audit).not.toBeNull();
    for (const level of ["full", "reduced", "static"] as const) {
      expect(audit?.modes[level].axe.violations).toEqual([]);
    }
  });

  it("uses the catalog icon as its favicon, unchanged", () => {
    const icon = readFileSync(path.join(app, "src", "app", "icon.svg"), "utf8");
    const asset = readFileSync(
      path.join(app, "..", "..", "assets", "icons", "svg", "S08-halcyon.svg"),
      "utf8",
    );
    expect(icon).toBe(asset);
  });
});
