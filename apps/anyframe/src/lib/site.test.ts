import { readFileSync } from "node:fs";
import path from "node:path";
import { frame } from "@quartifex/safeframe";
import { describe, expect, it } from "vitest";
import { SCENE } from "../scene/scene";

const app = path.join(import.meta.dirname, "..", "..");

describe("anyframe", () => {
  it("uses the catalog icon as its favicon, unchanged", () => {
    const icon = readFileSync(path.join(app, "src", "app", "icon.svg"), "utf8");
    const asset = readFileSync(
      path.join(app, "..", "..", "assets", "icons", "svg", "S13-anyframe.svg"),
      "utf8",
    );
    expect(icon).toBe(asset);
  });

  it("keeps the subject whole and the copy clear on every device it shows", () => {
    for (const size of [
      { width: 390, height: 844 },
      { width: 820, height: 1180 },
      { width: 1440, height: 900 },
      { width: 3440, height: 1440 },
      { width: 5120, height: 1440 },
      { width: 844, height: 390 },
    ]) {
      const staged = frame(SCENE, size);
      expect(staged.subjectClipped, `${size.width}x${size.height}`).toBe(false);
      expect(staged.textOverlap, `${size.width}x${size.height}`).toBe(0);
    }
  });

  it("budgets this site in budget.json for heft", () => {
    const budget = JSON.parse(readFileSync(path.join(app, "..", "..", "budget.json"), "utf8")) as {
      apps: Array<{ app: string; heft?: { scroll?: { cls?: number } } }>;
    };
    const entry = budget.apps.find((a) => a.app === "anyframe");
    expect(entry?.heft?.scroll?.cls).toBeLessThanOrEqual(0.1);
  });
});
