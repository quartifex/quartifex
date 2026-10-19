import { describe, expect, it } from "vitest";
import { format, formatDate, formatNumber, formatPercent, LOCALES, loadLocale } from "./index";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("locale files", () => {
  for (const code of Object.keys(LOCALES) as Array<keyof typeof LOCALES>) {
    it(`${code} has every key, with the same placeholders, and nothing extra`, async () => {
      const en = (await loadLocale("en")) as Record<string, string>;
      const s = (await loadLocale(code)) as Record<string, string>;
      expect(Object.keys(s).sort()).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en)) {
        expect(placeholders(s[key] ?? ""), `${code}:${key}`).toEqual(placeholders(en[key] ?? ""));
        expect((s[key] ?? "").trim(), `${code}:${key} is empty`).not.toBe("");
      }
    });
  }
});

describe("formatting", () => {
  it("groups digits the Indian way in both languages", () => {
    expect(formatNumber("en", 1234567)).toBe("12,34,567");
    expect(formatNumber("hi", 1234567)).toBe("12,34,567");
  });
  it("writes dates as DD/MM/YYYY", () => {
    expect(formatDate("2026-07-04")).toBe("04/07/2026");
  });
  it("writes percentages with one decimal at most", () => {
    expect(formatPercent("en", 66.7)).toBe("67%");
    expect(formatPercent("en", 50)).toBe("50%");
    expect(formatPercent("en", null)).toBe("–");
  });
  it("fills placeholders and leaves unknown ones", () => {
    expect(format("{a} of {b}", { a: 1 })).toBe("1 of {b}");
  });
});
