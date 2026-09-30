import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Entry = {
  id: string;
  kind: string;
  name: string;
  prompt: string;
  deps?: string[];
  libs?: string | null;
};

const root = new URL("../", import.meta.url);
const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, root), "utf8"));

function entries(path: string): Entry[] {
  const raw = read(path);
  if (!Array.isArray(raw)) throw new Error(`${path} is not an array`);
  return raw.filter(
    (e): e is Entry =>
      typeof e === "object" && e !== null && typeof e.id === "string" && typeof e.name === "string",
  );
}

const catalog = entries("catalog/catalog.json");
const icons = entries("assets/icons/icons.json");
const ids = new Set(catalog.map((e) => e.id));
const wave = (prompt: string) => Number(prompt.replace(/\D/g, ""));

describe("catalog", () => {
  it("holds 29 libraries, 19 sites and 14 Lab seeds", () => {
    const count = (kind: string) => catalog.filter((e) => e.kind === kind).length;
    expect(catalog).toHaveLength(62);
    expect([count("lib"), count("site"), count("lab")]).toEqual([29, 19, 14]);
  });

  it("has unique ids and unique names (names are routes and package names)", () => {
    expect(new Set(catalog.map((e) => e.id)).size).toBe(catalog.length);
    expect(new Set(catalog.map((e) => e.name)).size).toBe(catalog.length);
  });

  it("only depends on items that exist", () => {
    for (const entry of catalog) {
      const libs = typeof entry.libs === "string" ? entry.libs.split(",").map((s) => s.trim()) : [];
      for (const dep of [...(entry.deps ?? []), ...libs]) {
        expect(ids.has(dep), `${entry.id} -> ${dep}`).toBe(true);
      }
    }
  });

  it("never schedules an item before something it depends on", () => {
    const byId = new Map(catalog.map((e) => [e.id, e]));
    for (const entry of catalog) {
      for (const dep of entry.deps ?? []) {
        const target = byId.get(dep);
        if (!target) continue;
        expect(wave(target.prompt), `${entry.id} needs ${dep}`).toBeLessThanOrEqual(
          wave(entry.prompt),
        );
      }
    }
  });
});

describe("icons", () => {
  it("has one SVG for every catalog item", () => {
    expect(icons).toHaveLength(62);
    for (const entry of catalog) {
      const file = new URL(`assets/icons/svg/${entry.id}-${entry.name}.svg`, root);
      expect(existsSync(file), `${entry.id}-${entry.name}.svg`).toBe(true);
    }
  });

  it("ships each icon with its own reduced-motion rule", () => {
    for (const entry of catalog) {
      const svg = readFileSync(
        new URL(`assets/icons/svg/${entry.id}-${entry.name}.svg`, root),
        "utf8",
      );
      expect(svg, entry.id).toContain("prefers-reduced-motion");
    }
  });
});
