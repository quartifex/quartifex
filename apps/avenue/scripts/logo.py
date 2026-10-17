#!/usr/bin/env python3
# Writes the placeholder AVENUE wordmark, public/brand/avenue-logo.svg: the word set in the
# display face (Archivo, instanced wide and light), converted to outlines so it renders
# anywhere as one file. The final logo replaces this one file; nothing else needs to change.
# Needs fontTools and brotli: pip install fonttools brotli
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

app = Path(__file__).resolve().parent.parent
src = app / "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2"
font = instantiateVariableFont(TTFont(src), {"wdth": 125, "wght": 360})
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
cap = font["OS/2"].sCapHeight
tracking = 0.16 * font["head"].unitsPerEm
pen = SVGPathPen(glyphs)
x = 0.0
word = "AVENUE"
for i, ch in enumerate(word):
    name = cmap[ord(ch)]
    glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, cap)))
    x += glyphs[name].width + (tracking if i < len(word) - 1 else 0)
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {round(x)} {cap}" role="img" '
    f'aria-label="AVENUE"><title>AVENUE</title><path fill="currentColor" d="{pen.getCommands()}"/></svg>\n'
)
out = app / "public/brand/avenue-logo.svg"
out.write_text(svg)
print(f"logo: {round(x)} x {cap} units, {len(svg)} bytes")

# The favicon: the wordmark's "A" on the cabin colour, from the same instance.
ipen = SVGPathPen(glyphs)
name = cmap[ord("A")]
gw = glyphs[name].width
size = round(max(gw, cap) * 1.5)
ox = (size - gw) / 2
oy = (size + cap) / 2
glyphs[name].draw(TransformPen(ipen, (1, 0, 0, -1, ox, oy)))
icon = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
    f'<rect width="{size}" height="{size}" rx="{round(size * 0.22)}" fill="#07080a"/>'
    f'<path fill="#f0a640" d="{ipen.getCommands()}"/></svg>\n'
)
(app / "src/app/icon.svg").write_text(icon)
print(f"icon: {size} units")
