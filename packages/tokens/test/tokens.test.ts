import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");
const fonts = readFileSync(new URL("../src/fonts.css", import.meta.url), "utf8");

/** Custom properties declared inside the first block that follows `selector`. */
function declared(selector: string): Set<string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const names = css.slice(open, close).match(/--qx-[a-z0-9-]+(?=\s*:)/g) ?? [];
  return new Set(names);
}

const THEMED = [
  "--qx-bg",
  "--qx-bg-raised",
  "--qx-fg",
  "--qx-muted",
  "--qx-hairline",
  "--qx-hairline-strong",
  "--qx-teal",
  "--qx-teal-ink",
  "--qx-sindoor",
];

describe("tokens.css", () => {
  it("defines every themed colour in the light default (the base :root, since 2 Oct 2026)", () => {
    const light = declared(":root {");
    for (const name of THEMED) expect(light.has(name), name).toBe(true);
    expect(css.slice(css.indexOf(":root {"), css.indexOf("}"))).toMatch(/--qx-bg:\s*#f4f2ee/);
  });

  it("mirrors every themed colour in dark, for both the explicit and the OS-preference path", () => {
    const explicit = declared(':root[data-theme="dark"]');
    const system = declared(":root:not([data-theme])");
    expect([...explicit].sort()).toEqual([...THEMED].sort());
    expect([...system].sort()).toEqual([...THEMED].sort());
    // The OS path applies dark only when the OS asks for it.
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme\]\)/);
  });

  it("holds the brand rules: no gradients, no shadows", () => {
    expect(css).not.toMatch(/gradient\(/);
    expect(css).not.toMatch(/box-shadow/);
  });

  it("zeroes durations under reduced motion", () => {
    const reduced = css.slice(css.indexOf("prefers-reduced-motion"));
    expect(reduced).toMatch(/--qx-duration:\s*0ms/);
  });

  it("names the three brand faces with system fallbacks", () => {
    expect(css).toMatch(/--qx-font-display:\s*"Clash Display".*system-ui/);
    expect(css).toMatch(/--qx-font-body:\s*"Satoshi".*system-ui/);
    expect(css).toMatch(/--qx-font-mono:\s*"DM Mono".*monospace/);
  });

  it("uses the confirmed Sindoor red in every theme", () => {
    const values = css.match(/--qx-sindoor:\s*(#[0-9a-f]{6})/g) ?? [];
    expect(values.length).toBe(3);
    for (const value of values) expect(value).toMatch(/#c1440e$/);
  });
});

describe("fonts.css", () => {
  it("self-hosts every face under /fonts/ with font-display: swap", () => {
    const faces = fonts.match(/@font-face\s*{[^}]*}/g) ?? [];
    expect(faces.length).toBeGreaterThanOrEqual(2);
    for (const face of faces) {
      expect(face).toMatch(/src:\s*url\("\/fonts\/[\w-]+\.woff2"\)/);
      expect(face).toMatch(/font-display:\s*swap/);
    }
  });

  it("loads nothing from a third-party host", () => {
    expect(fonts).not.toMatch(/https?:\/\//);
  });
});
