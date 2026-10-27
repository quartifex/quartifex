// Re-skins the catalog's tool icons in the UI kit's depth theme at read time.
//
// The source SVGs are dark squircle tiles with a gradient, a gloss and a hover hue. The kit draws
// its tiles in CSS (raised depth surface), so here the tile is dropped and the glyph is kept:
// ink follows the theme, the accent follows the brand, strokes sit on the kit's weight, and the
// glyph's own motion plays on hover or focus of the card instead of looping at rest.

const GLYPH =
  /<svg x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" viewBox="0 0 100 100"[^>]*>([\s\S]*)<\/svg>\s*<\/svg>\s*$/;
const CLIPS = /<clipPath[\s\S]*?<\/clipPath>/g;
const STYLE = /<style>([\s\S]*?)<\/style>/;
const ROOT_ID = /<svg id="([^"]+)"/;

/** Selectors that count as "the icon is live": the icon itself, or a card/tile that hosts it. */
const live = (id: string, tail: string) =>
  [`#${id}:hover`, `.qxi-host:hover #${id}`, `.qxi-host:focus-within #${id}`]
    .map((s) => `${s} ${tail}`)
    .join(",");

function rewriteStyle(id: string, css: string): string {
  const out: string[] = [];
  for (const raw of css.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    // the old per-icon hover hue (tile gradient and accent shift)
    if (line.startsWith(`#${id}:hover`)) continue;
    // the colour variables: ink and accent come from the kit tokens
    if (line.startsWith(`#${id}{`)) {
      out.push(`#${id}{--ink:var(--fg);--acc:var(--accent)}`);
      continue;
    }
    // an animation class: motion only when live; non-motion declarations stay at rest
    const rule = /^\.([\w-]+)\{(.*)\}$/.exec(line);
    if (rule?.[1] && rule[2] && rule[2].includes("animation:")) {
      const decls = rule[2].split(";").filter(Boolean);
      const motion = decls.filter((d) => d.startsWith("animation:"));
      const rest = decls.filter((d) => !d.startsWith("animation:"));
      if (rest.length) out.push(`.g .${rule[1]}{${rest.join(";")}}`);
      out.push(`${live(id, `.g .${rule[1]}`)}{${motion.join(";")}}`);
      continue;
    }
    if (line.startsWith("@media (prefers-reduced-motion")) {
      out.push(line);
      continue;
    }
    out.push(line);
  }
  // kit weight (a 100-grid glyph is drawn at 60%), depth, and the reduced-motion switch
  out.push(
    `#${id} .g{stroke-width:4.6;filter:drop-shadow(0 1px 0 var(--hl)) drop-shadow(0 3px 3px var(--sh1))}`,
    `html[data-motion="reduce"] #${id} .g *{animation:none!important}`,
    `html[data-touch] .qxi-host:hover #${id} .g *{animation:none!important}`,
  );
  return out.join("\n");
}

/** The icon in the kit's theme. Falls back to the original markup if its shape is unexpected. */
export function toKitIcon(svg: string): string {
  const id = ROOT_ID.exec(svg)?.[1];
  const glyph = GLYPH.exec(svg)?.[1];
  const style = STYLE.exec(svg)?.[1];
  if (!id || glyph === undefined || style === undefined) return svg;
  const clips = (svg.match(CLIPS) ?? []).join("");
  return (
    `<svg id="${id}" class="qxi" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img">` +
    `<defs>${clips}</defs><style>${rewriteStyle(id, style)}</style>` +
    `<g class="g" transform="translate(20 20) scale(.6)">${glyph}</g></svg>`
  );
}
