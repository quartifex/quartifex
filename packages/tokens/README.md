# @quartifex/tokens

Our brand tokens as CSS custom properties, and nothing else. Internal for now; it becomes
`restraint` (L20) when that library is built.

## Use

```css
@import "@quartifex/tokens/tokens.css";

body {
  background: var(--qx-bg);
  color: var(--qx-fg);
  font-family: var(--qx-font-body);
}
```

Dark is the default. Set `data-theme="light"` or `data-theme="dark"` on `<html>` to pin a
theme; with no attribute the OS preference decides.

## Rules the tokens encode

- Dark primary with a full light mirror: every themed colour has both values.
- Ganga teal (`--qx-teal`) is the single accent. Sindoor red (`--qx-sindoor`) is a rare
  accent: one mark per screen, dot-scale, never a fill or body text.
- Hairlines (`--qx-hairline`), not shadows. No gradients in site UI.
- Durations collapse to `0ms` under `prefers-reduced-motion: reduce`.

## Fonts

The tokens name the faces and fall back to system fonts. We do not ship font files here.

| Face | Role | Source | Licence |
| --- | --- | --- | --- |
| Clash Display | Headings | https://www.fontshare.com/fonts/clash-display | ITF Free Font License |
| Satoshi | Body | https://www.fontshare.com/fonts/satoshi | ITF Free Font License |
| DM Mono | Metadata | https://fonts.google.com/specimen/DM+Mono | SIL Open Font License 1.1 |

Read the ITF licence before committing Clash Display or Satoshi files to a public repo.
Until that is settled, apps load them from Fontshare or fall back to system fonts.

## Size

`tokens.css` is budgeted at 2 kB (brotli), checked by `pnpm size`.

## Licence

MIT.
