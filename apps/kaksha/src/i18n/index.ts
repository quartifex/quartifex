// Strings live in one JSON file per language (src/i18n/locales). To add a language,
// copy en.json, translate the values, and add it to LOCALES below. Keys never change
// meaning; a test checks every file has exactly the same keys and placeholders.
import en from "./locales/en.json";
import hi from "./locales/hi.json";

export type Strings = typeof en;
export type Key = keyof Strings;

export const LOCALES = {
  en: { label: "English", short: "EN", intl: "en-IN", strings: en as Strings },
  hi: { label: "हिन्दी", short: "हिं", intl: "hi-IN", strings: hi as Strings },
} as const;

export type Locale = keyof typeof LOCALES;
export const LOCALE_KEY = "kaksha-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && value in LOCALES;
}

/** Replace {name} placeholders. */
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function translate(
  locale: Locale,
  key: Key,
  vars?: Record<string, string | number>,
): string {
  const s = LOCALES[locale].strings[key] ?? LOCALES.en.strings[key] ?? key;
  return format(s, vars);
}

export function readStoredLocale(): Locale | null {
  try {
    const v = localStorage.getItem(LOCALE_KEY);
    return isLocale(v) ? v : null;
  } catch {
    return null;
  }
}

/** Indian digit grouping (1,00,000) in either language. */
export function formatNumber(locale: Locale, n: number, digits = 0): string {
  return new Intl.NumberFormat(LOCALES[locale].intl, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
    numberingSystem: "latn",
  }).format(n);
}

export function formatPercent(locale: Locale, p: number | null): string {
  if (p === null) return "–";
  return `${formatNumber(locale, p, 1)}%`;
}

/** DD/MM/YYYY from an ISO date, the way registers are written in India. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

export function collator(locale: Locale): Intl.Collator {
  return new Intl.Collator(LOCALES[locale].intl, { numeric: true, sensitivity: "base" });
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
