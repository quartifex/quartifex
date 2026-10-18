// Generates the Kaksha brand SVGs: the mascot mark (Tikki, a school slate whose
// smile is a tick), a maskable app icon, a monochrome mark, and the wordmark lockup.
import fs from "node:fs";
import path from "node:path";
import { textPath } from "./textpath.mjs";

const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });

const C = {
  paper: "#F7F2E7",
  ink: "#1B2340",
  slate: "#2C3A63",
  genda1: "#FFC94A",
  genda2: "#EE8A0B",
  chalk: "#FBF7EE",
};

// Tikki on its own, drawn in a 512 box. `tilt` gives it a little life.
function tikki({ face = C.chalk, body = C.ink, panel = C.slate, tilt = -6 } = {}) {
  return `<g transform="rotate(${tilt} 256 262)">
    <rect x="92" y="118" width="328" height="284" rx="64" fill="${body}"/>
    <rect x="124" y="150" width="264" height="220" rx="38" fill="${panel}"/>
    <circle cx="204" cy="232" r="23" fill="${face}"/>
    <circle cx="306" cy="232" r="23" fill="${face}"/>
    <path d="M196 296 L240 334 L320 266" fill="none" stroke="${face}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

const gradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.genda1}"/><stop offset="1" stop-color="${C.genda2}"/></linearGradient></defs>`;

// App icon: Tikki on a marigold squircle.
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Kaksha">${gradient}<rect width="512" height="512" rx="116" fill="url(#g)"/>${tikki()}</svg>`;

// Maskable icon: full bleed, Tikki shrunk into the 80% safe zone.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${gradient}<rect width="512" height="512" fill="url(#g)"/><g transform="translate(256 262) scale(0.72) translate(-256 -262)">${tikki()}</g></svg>`;

// Monochrome mark for print, favicons on busy tabs and the PDF report.
const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${tikki({ face: C.ink, panel: C.paper, body: C.ink })}</svg>`;

// Wordmark lockup: mark + "kaksha" + कक्षा. All text converted to paths.
const fontDir = path.join(import.meta.dirname, "ttf");
const latin = await textPath(path.join(fontDir, "mukta-latin-700-normal.ttf"), "kaksha", 112, {
  x: 0,
  y: 0,
  tracking: -0.01,
});
const deva = await textPath(path.join(fontDir, "mukta-devanagari-700-normal.ttf"), "कक्षा", 78, {
  x: 0,
  y: 0,
});
const markSize = 132;
const gap = 30;
const latinX = markSize + gap;
const devaX = latinX + latin.width + 34;
const W = Math.ceil(devaX + deva.width + 4);
const H = 140;
const lockup = (
  ink,
  rule,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kaksha (कक्षा)">
  ${gradient}
  <g transform="scale(${markSize / 512}) translate(0 ${(H - markSize) / 2 / (markSize / 512)})"><rect width="512" height="512" rx="116" fill="url(#g)"/>${tikki()}</g>
  <g fill="${ink}" transform="translate(${latinX} 100)">${latin.svg}</g>
  <rect x="${devaX - 18}" y="38" width="3" height="66" rx="1.5" fill="${rule}"/>
  <g fill="${ink}" transform="translate(${devaX} 101)">${deva.svg}</g>
</svg>`;

fs.writeFileSync(path.join(out, "mark.svg"), mark);
fs.writeFileSync(path.join(out, "maskable.svg"), maskable);
fs.writeFileSync(path.join(out, "mark-mono.svg"), mono);
fs.writeFileSync(path.join(out, "logo.svg"), lockup(C.ink, "#E9A23B"));
fs.writeFileSync(path.join(out, "logo-dark.svg"), lockup(C.chalk, "#F5B533"));
console.log("wrote", out, W, H);
