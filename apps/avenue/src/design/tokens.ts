// AVENUE's design tokens: the one file the site, the in-car interface and the design-system
// docs all read. Change a value here and the docs' token tables, the demo and the page follow.
// Contrast pairs at the bottom are checked against WCAG 2.2 AA by tokens.test.ts.

export type Theme = "cabin" | "paper";

/** Colour, per theme. "cabin" is Night, the default (car interfaces live in the dark);
 * "paper" is Day, the theme the research and documentation read in. One accent: lane blue.
 * Ember is the tail-light warmth, used once per view at most. Red is reserved for SOS.
 * The brand book (the AVENUE design system) names these ground, surface, ink and so on. */
export const colour = {
  cabin: {
    bg: "#06070a",
    surface: "#0c0f14",
    raised: "#141922",
    sunken: "#090b0f",
    control: "#1c2230",
    line: "rgb(255 255 255 / 0.14)",
    lineStrong: "rgb(255 255 255 / 0.32)",
    text: "#eef1f6",
    textMuted: "#8e97a8",
    textFaint: "#808a9c",
    accent: "#2d63ee",
    accentText: "#9cc6ff",
    onAccent: "#ffffff",
    danger: "#e0302e",
    onDanger: "#ffffff",
    focus: "#9cc6ff",
    ice: "#9cc6ff",
    laneDeep: "#0b1f66",
    ember: "#ff6a2b",
    emberDeep: "#4a1206",
    duskSky: "#10203f",
    duskHaze: "#1a1430",
    glass: "rgb(20 25 34 / 0.72)",
  },
  paper: {
    bg: "#f1f2f4",
    surface: "#ffffff",
    raised: "#e7eaef",
    sunken: "#e2e5ea",
    control: "#d9dee6",
    line: "rgb(10 13 18 / 0.16)",
    lineStrong: "rgb(10 13 18 / 0.4)",
    text: "#0a0d12",
    textMuted: "#4b5364",
    textFaint: "#575f70",
    accent: "#1f55e0",
    accentText: "#1f55e0",
    onAccent: "#ffffff",
    danger: "#c81e1e",
    onDanger: "#ffffff",
    focus: "#1f55e0",
    ice: "#6e9bf0",
    laneDeep: "#c9d8f7",
    ember: "#c2410c",
    emberDeep: "#f6d6c6",
    duskSky: "#c4d6ef",
    duskHaze: "#f3e3da",
    glass: "rgb(255 255 255 / 0.72)",
  },
} as const;

export type ColourToken = keyof (typeof colour)["cabin"];

/** What each colour is for, shown in the docs. */
export const colourRoles: Record<ColourToken, string> = {
  bg: "Page and cabin background",
  surface: "Panels and screens",
  raised: "Cards and controls at rest",
  sunken: "Wells, tracks and inputs",
  control: "Pressed and selected control fill",
  line: "Hairlines that separate",
  lineStrong: "Borders that must be seen (3:1 against the surface)",
  text: "Primary text",
  textMuted: "Secondary text",
  textFaint: "Tertiary text and placeholders (still 4.5:1)",
  accent: "The one accent: fills, meters, the active state",
  accentText: "Accent as text or icon on the theme's surfaces",
  onAccent: "Text on an accent fill",
  danger: "SOS and destructive actions only",
  onDanger: "Text on a danger fill",
  focus: "Keyboard focus ring",
  ice: "Glow tint: the bright core of the headlight gradient (decorative by day)",
  laneDeep: "Far end of the headlight gradient",
  ember: "Tail-light warmth: the Moving state and the driver seat, once per view",
  emberDeep: "Far end of the tail-light gradient",
  duskSky: "Top of the dusk wash behind Day sections",
  duskHaze: "Bottom of the dusk wash: warm haze at the horizon",
  glass: "The cabin UI's mica layer, under a backdrop blur",
};

export const font = {
  display: "var(--font-display), 'Archivo', 'Helvetica Neue', Arial, sans-serif",
  ui: "var(--font-display), 'Archivo', 'Helvetica Neue', Arial, sans-serif",
  narrow: "var(--font-narrow), 'Archivo Narrow', 'Arial Narrow', sans-serif",
  mono: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
} as const;

/** Type scale. Site sizes are fluid between a 360 px and a 1440 px viewport; the in-car
 * interface uses the `screen` sizes, in container units so it scales with its screen. */
export const type = {
  site: {
    mega: { min: 64, max: 220, line: 0.86, weight: 340, track: 0.06, width: 125 },
    hero: { min: 40, max: 96, line: 0.96, weight: 400, track: -0.025, width: 100 },
    h1: { min: 34, max: 72, line: 1.0, weight: 400, track: -0.025, width: 100 },
    h2: { min: 28, max: 56, line: 1.02, weight: 400, track: -0.02, width: 100 },
    h3: { min: 20, max: 28, line: 1.15, weight: 450, track: -0.01, width: 100 },
    body: { min: 16, max: 18, line: 1.6, weight: 400, track: 0, width: 100 },
    small: { min: 14, max: 15, line: 1.5, weight: 400, track: 0.005, width: 100 },
    mono: { min: 12, max: 13, line: 1.4, weight: 400, track: 0.04, width: 100 },
  },
  screen: {
    display: { size: 4.2, line: 1.05, weight: 360 },
    title: { size: 2.1, line: 1.15, weight: 560 },
    body: { size: 1.45, line: 1.4, weight: 440 },
    label: { size: 1.22, line: 1.25, weight: 520 },
    caption: { size: 1.05, line: 1.3, weight: 460 },
  },
} as const;

/** Spacing, on a 4 px base. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 96,
  10: 128,
} as const;

/** Radii. Nested surfaces are concentric: outer = inner + the padding between them. */
export const radius = { xs: 2, sm: 10, md: 14, lg: 24, xl: 32, pill: 999 } as const;

/** Elevation: soft surfaces (a top highlight and a low, wide shadow) rather than hard borders.
 * The hi-fi concept's neumorphism, kept as a feel, restyled so every edge still meets 3:1. */
export const elevation = {
  0: "none",
  1: "inset 0 1px 0 rgb(255 255 255 / 0.08), 0 2px 6px rgb(0 0 0 / 0.35)",
  2: "inset 0 1px 0 rgb(255 255 255 / 0.1), 0 10px 30px rgb(0 0 0 / 0.45)",
  3: "inset 0 1px 0 rgb(255 255 255 / 0.12), 0 24px 60px rgb(0 0 0 / 0.55)",
  pressed: "inset 0 2px 6px rgb(0 0 0 / 0.5), inset 0 -1px 0 rgb(255 255 255 / 0.04)",
} as const;

/** Motion. Durations in ms; easings as cubic-bezier lists. */
export const motion = {
  duration: { instant: 90, quick: 160, base: 240, slow: 420, camera: 1100 },
  ease: {
    // Haptic-like: a fast, decisive start that settles without overshoot.
    press: [0.2, 0, 0, 1],
    // "Lane": everything that settles.
    out: [0.22, 1, 0.36, 1],
    inOut: [0.65, 0, 0.35, 1],
  },
  /** A pressed control scales to this. */
  pressScale: 0.97,
} as const;

/** Touch targets, in CSS px. Driver mode while moving uses `driving`. */
export const target = { min: 48, comfortable: 64, driving: 76 } as const;

/** Colour pairs that must meet WCAG 2.2 AA in both themes: [foreground, background, minimum]. */
export const contrastPairs: Array<[ColourToken, ColourToken, number]> = [
  ["text", "bg", 4.5],
  ["text", "surface", 4.5],
  ["text", "raised", 4.5],
  ["text", "control", 4.5],
  ["textMuted", "surface", 4.5],
  ["textMuted", "raised", 4.5],
  ["textFaint", "surface", 4.5],
  ["textFaint", "raised", 4.5],
  ["accentText", "surface", 4.5],
  ["accentText", "raised", 4.5],
  ["onAccent", "accent", 4.5],
  ["onDanger", "danger", 4.5],
  ["focus", "surface", 3],
  ["focus", "bg", 3],
  ["accent", "surface", 3],
  ["danger", "surface", 3],
];

const cssBezier = (b: readonly number[]) => `cubic-bezier(${b.join(", ")})`;

/** Every token as CSS custom properties: `:root` is the cabin theme, `[data-theme=paper]`
 * the light one. Rendered once into the page's head by the layout. */
export function tokensCss(): string {
  const vars = (theme: Theme) =>
    Object.entries(colour[theme])
      .map(([k, v]) => `--c-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v};`)
      .join("");
  const fluid = Object.entries(type.site)
    .map(([k, t]) => {
      const slope = (t.max - t.min) / (1440 - 360);
      const intercept = t.min - slope * 360;
      const size = `clamp(${t.min / 16}rem, ${(intercept / 16).toFixed(4)}rem + ${(slope * 100).toFixed(4)}vw, ${t.max / 16}rem)`;
      return `--t-${k}:${size};--lh-${k}:${t.line};--w-${k}:${t.weight};--wd-${k}:${t.width};--tr-${k}:${t.track}em;`;
    })
    .join("");
  const spacing = Object.entries(space)
    .map(([k, v]) => `--s-${k}:${v / 16}rem;`)
    .join("");
  const radii = Object.entries(radius)
    .map(([k, v]) => `--r-${k}:${v}px;`)
    .join("");
  const shadows = Object.entries(elevation)
    .map(([k, v]) => `--e-${k}:${v};`)
    .join("");
  const m = motion;
  const motionVars = `--d-quick:${m.duration.quick}ms;--d-base:${m.duration.base}ms;--d-slow:${m.duration.slow}ms;--ease-press:${cssBezier(m.ease.press)};--ease-out:${cssBezier(m.ease.out)};--ease-in-out:${cssBezier(m.ease.inOut)};--press-scale:${m.pressScale};`;
  const targets = `--target-min:${target.min}px;--target-comfortable:${target.comfortable}px;--target-driving:${target.driving}px;`;
  return `:root,[data-theme="cabin"]{color-scheme:dark;${vars("cabin")}${fluid}${spacing}${radii}${shadows}${motionVars}${targets}}[data-theme="paper"]{color-scheme:light;${vars("paper")}}[data-theme="cabin"]{${vars("cabin")}}`;
}

// --- WCAG maths, used by the tests and the docs' contrast table.

function channel(v: number) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Parse "#rrggbb" or "rgb(r g b / a)" into RGBA (0 to 255, alpha 0 to 1). */
export function parseColour(value: string): [number, number, number, number] {
  if (value.startsWith("#")) {
    const n = Number.parseInt(value.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = value.match(/rgb\((\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?\)/);
  if (!m) throw new Error(`Cannot parse colour ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ? Number(m[4]) : 1];
}

/** Composite a translucent colour over an opaque one. */
export function over(fg: string, bg: string): [number, number, number] {
  const [r, g, b, a] = parseColour(fg);
  const [R, G, B] = parseColour(bg);
  return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
}

export function luminance([r, g, b]: [number, number, number]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio of a foreground (possibly translucent) on a background. */
export function contrast(fg: string, bg: string): number {
  const a = luminance(over(fg, bg));
  const b = luminance(over(bg, bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
