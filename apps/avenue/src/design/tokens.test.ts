import { describe, expect, it } from "vitest";
import { colour, contrast, contrastPairs, tokensCss } from "./tokens";

describe("tokens", () => {
  for (const theme of ["cabin", "paper"] as const) {
    it(`meets WCAG 2.2 AA in the ${theme} theme`, () => {
      const c = colour[theme];
      for (const [fg, bg, min] of contrastPairs) {
        const ratio = contrast(c[fg], c[bg]);
        expect(ratio, `${theme}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          min,
        );
      }
    });
  }

  it("writes every colour as a custom property in both themes", () => {
    const css = tokensCss();
    expect(css).toContain("--c-text-muted:#9aa4b7;");
    expect(css).toContain('[data-theme="paper"]');
    expect(css).toMatch(/--t-hero:clamp\(/);
  });
});
