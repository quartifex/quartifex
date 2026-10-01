import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newLib, newSite } from "../scripts/lib/scaffold.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url));
let root = "";

// Each test runs the generators against a throwaway copy of the files they touch.
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "qx-gen-"));
  for (const dir of ["templates", "catalog"])
    cpSync(path.join(repo, dir), path.join(root, dir), { recursive: true });
  cpSync(path.join(repo, "budget.json"), path.join(root, "budget.json"));
  mkdirSync(path.join(root, ".changeset"));
  mkdirSync(path.join(root, "apps", "lab", "src", "demos"), { recursive: true });
  cpSync(
    path.join(repo, "apps", "lab", "src", "demos", "index.ts"),
    path.join(root, "apps", "lab", "src", "demos", "index.ts"),
  );
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

const stateOf = (name: string): unknown => {
  const catalog: unknown = JSON.parse(
    readFileSync(path.join(root, "catalog", "catalog.json"), "utf8"),
  );
  if (!Array.isArray(catalog)) return undefined;
  return catalog.find((entry: { name?: unknown }) => entry.name === name)?.state;
};

describe("new:lib", () => {
  it("creates a package that matches the definition of done", () => {
    const { dir } = newLib(root, "inbetween");
    const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));

    expect(pkg.name).toBe("@quartifex/inbetween");
    expect(pkg.type).toBe("module");
    expect(pkg.license).toBe("MIT");
    expect(Object.keys(pkg.exports)).toEqual([".", "./react", "./package.json"]);
    expect(pkg.peerDependenciesMeta.gsap.optional).toBe(true);
    expect(pkg["size-limit"].length).toBeGreaterThan(0);
    for (const file of ["README.md", "src/index.ts", "src/react.ts", "src/index.test.ts"]) {
      expect(existsSync(path.join(dir, file)), file).toBe(true);
    }
  });

  it("fills every placeholder", () => {
    const { dir } = newLib(root, "inbetween");
    for (const file of files(dir))
      expect(readFileSync(file, "utf8"), file).not.toMatch(/__[A-Z]+__/);
  });

  it("adds a hub demo, a changeset, and marks the item in progress", () => {
    newLib(root, "inbetween");
    const demos = path.join(root, "apps", "lab", "src", "demos");
    expect(existsSync(path.join(demos, "inbetween.tsx"))).toBe(true);
    expect(readFileSync(path.join(demos, "index.ts"), "utf8")).toContain(
      '"inbetween": lazy(() => import("./inbetween")),',
    );
    expect(readFileSync(path.join(root, ".changeset", "inbetween-initial.md"), "utf8")).toContain(
      '"@quartifex/inbetween": minor',
    );
    expect(stateOf("inbetween")).toBe("in progress");
  });

  it("refuses names that are not libraries in the catalog, and never overwrites", () => {
    expect(() => newLib(root, "not-in-catalog")).toThrow(/not in catalog/);
    expect(() => newLib(root, "anyframe")).toThrow(/is a site/);
    expect(() => newLib(root, "Bad Name")).toThrow(/not a valid name/);
    newLib(root, "inbetween");
    expect(() => newLib(root, "inbetween")).toThrow(/already exists/);
  });
});

describe("new:site", () => {
  it("creates an app carrying its honest label from the catalog", () => {
    const { dir } = newSite(root, "halcyon");
    const page = readFileSync(path.join(dir, "src", "app", "page.tsx"), "utf8");
    const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));

    expect(pkg.name).toBe("@quartifex/site-halcyon");
    expect(page).toContain('data-testid="honest-label"');
    expect(page).not.toMatch(/__[A-Z]+__/);
    expect(readFileSync(path.join(dir, "README.md"), "utf8")).toContain("Launch gate");
    expect(stateOf("halcyon")).toBe("in progress");
  });

  it("adds a budget entry once", () => {
    newSite(root, "halcyon");
    const budget = JSON.parse(readFileSync(path.join(root, "budget.json"), "utf8"));
    expect(budget.apps.filter((app: { app: string }) => app.app === "halcyon")).toHaveLength(1);
  });

  it("refuses libraries", () => {
    expect(() => newSite(root, "inbetween")).toThrow(/is a lib/);
  });
});
