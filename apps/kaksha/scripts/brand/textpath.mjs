// Shape text with HarfBuzz and return SVG <path> groups (no font needed to render).
import fs from "node:fs";
import * as hb from "harfbuzzjs";

const ready = hb.ready ?? Promise.resolve();

export async function textPath(fontFile, text, size, { x = 0, y = 0, tracking = 0 } = {}) {
  await ready;
  const blob = new hb.Blob(fs.readFileSync(fontFile));
  const face = new hb.Face(blob, 0);
  const font = new hb.Font(face);
  const upem = face.upem;
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(font, buf);
  const s = size / upem;
  let pen = 0;
  const parts = [];
  for (const g of buf.getGlyphInfosAndPositions()) {
    const d = font.glyphToPath(g.codepoint);
    const gx = x + (pen + (g.xOffset ?? 0)) * s;
    const gy = y - (g.yOffset ?? 0) * s;
    if (d)
      parts.push(
        `<path transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${s.toFixed(5)} ${(-s).toFixed(5)})" d="${d}"/>`,
      );
    pen += (g.xAdvance ?? 0) + tracking * upem;
  }
  return { svg: parts.join(""), width: pen * s };
}
