# Brand generator

Draws the Kaksha marks in `public/brand/` from code: the K (an upright stroke with two
leaves, the upper one mint green, the lower one blue) on a blue squircle as the app icon, the
maskable icon, the K alone, a one-colour mark, and the wordmark lockup with "kaksha" and
कक्षा converted to outlines, so the logo needs no font to render.

The text is shaped with HarfBuzz (needed for the क्ष conjunct) from Barlow Condensed Bold
and Mukta Bold (both SIL OFL 1.1).

```sh
node scripts/brand/ttf.mjs            # unpack the fonts to scripts/brand/ttf (git-ignored)
node scripts/brand/brand.mjs public/brand
```

The final logo is a single file swap: replace `public/brand/logo.svg` (and `logo-dark.svg`).
