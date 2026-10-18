# Brand generator

Draws the Kaksha marks in `public/brand/` from code: Tikki (a school slate whose smile is a
tick) on a marigold squircle, the maskable icon, a one-colour mark, and the wordmark lockup
with "kaksha" and कक्षा converted to outlines, so the logo needs no font to render.

The text is shaped with HarfBuzz (needed for the क्ष conjunct) from Mukta Bold (SIL OFL 1.1).

```sh
npm i --no-save harfbuzzjs wawoff2 @fontsource/mukta
node scripts/brand/ttf.mjs            # unpack Mukta Bold to scripts/brand/ttf (git-ignored)
node scripts/brand/brand.mjs public/brand
```

The final logo is a single file swap: replace `public/brand/logo.svg` (and `logo-dark.svg`).
