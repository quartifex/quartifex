// Generates the Kaksha brand SVGs from the K mark: an upright stroke with two leaves,
// the upper one mint green, the lower one blue. App icon, maskable icon, one-colour mark,
// and the wordmark lockup with "kaksha" and कक्षा converted to outlines (no font needed).
import fs from "node:fs";
import path from "node:path";
import { textPath } from "./textpath.mjs";

const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });

export const C = {
  blue: "#0B44FF",
  blueDeep: "#0631C7",
  mint: "#7DEBC0",
  mintSoft: "#DDF8EC",
  ink: "#0E1433",
  white: "#FFFFFF",
};

// The K, drawn in a 160 x 176 box (stroke 49 wide, leaves to the right).
function k({ stroke, upper, lower }) {
  return `<rect x="0" y="0" width="49" height="176" fill="${stroke}"/>
  <path d="M49 0H160C157 48 118 80 49 69Z" fill="${upper}"/>
  <path d="M49 69C110 69 155 118 160 176H106C101 130 80 90 49 69Z" fill="${lower}"/>`;
}

// Centre the K in a 512 box at a given height.
function placed(h, colours) {
  const s = h / 176;
  const w = 160 * s;
  return `<g transform="translate(${((512 - w) / 2 + 6).toFixed(2)} ${((512 - h) / 2).toFixed(2)}) scale(${s.toFixed(4)})">${k(colours)}</g>`;
}

const onBlue = { stroke: C.mintSoft, upper: C.white, lower: C.mint };
const onLight = { stroke: C.blue, upper: C.mint, lower: C.blue };

// App icon: the K in light tones on a blue squircle.
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Kaksha"><rect width="512" height="512" rx="116" fill="${C.blue}"/>${placed(300, onBlue)}</svg>`;

// Maskable icon: full bleed, the K inside the 80% safe zone.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${C.blue}"/>${placed(240, onBlue)}</svg>`;

// The K alone on light ground, and one colour for print.
const glyph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Kaksha">${placed(380, onLight)}</svg>`;
const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${placed(380, { stroke: C.ink, upper: C.ink, lower: C.ink })}</svg>`;

// Wordmark lockup: K + "kaksha" + कक्षा, all outlined.
const fontDir = path.join(import.meta.dirname, "ttf");
const latin = await textPath(
  path.join(fontDir, "barlow-condensed-latin-700-normal.ttf"),
  "kaksha",
  124,
  {
    tracking: 0.005,
  },
);
const deva = await textPath(path.join(fontDir, "mukta-devanagari-700-normal.ttf"), "कक्षा", 74);
const H = 140;
const kH = 112;
const kS = kH / 176;
const kW = 160 * kS;
const latinX = kW + 26;
const devaX = latinX + latin.width + 30;
const W = Math.ceil(devaX + deva.width + 4);
const lockup = (colours, ink, rule) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kaksha (कक्षा)">
  <g transform="translate(0 ${(H - kH) / 2}) scale(${kS.toFixed(4)})">${k(colours)}</g>
  <g fill="${ink}" transform="translate(${latinX.toFixed(2)} 113)">${latin.svg}</g>
  <rect x="${(devaX - 16).toFixed(2)}" y="44" width="3" height="60" rx="1.5" fill="${rule}"/>
  <g fill="${ink}" transform="translate(${devaX.toFixed(2)} 104)">${deva.svg}</g>
</svg>`;

fs.writeFileSync(path.join(out, "mark.svg"), mark);
fs.writeFileSync(path.join(out, "maskable.svg"), maskable);
fs.writeFileSync(path.join(out, "glyph.svg"), glyph);
fs.writeFileSync(path.join(out, "mark-mono.svg"), mono);
fs.writeFileSync(path.join(out, "logo.svg"), lockup(onLight, C.ink, C.mint));
fs.writeFileSync(path.join(out, "logo-dark.svg"), lockup(onBlue, C.white, "#5D7BFF"));
console.log("wrote", out, W, H);
