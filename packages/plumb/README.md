# @quartifex/plumb

A stable viewport for scroll-driven pages. On phones, the window height changes while you
scroll (the browser's toolbars collapse and expand) and again when the keyboard opens.
Pinned scenes that listen to `resize` recalculate on every one of those frames, and
`100vh` jumps. We measure the viewport once per frame, sort each change into toolbar,
keyboard or real resize, keep steady CSS variables, and emit one debounced event only
when the layout really changed: width, orientation, pixel ratio or fold posture.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/plumb
```

```ts
import { createPlumb } from "@quartifex/plumb";

const plumb = createPlumb();

plumb.subscribe((viewport, change) => {
  // Once per real layout change, never for toolbars or the keyboard.
  console.log(change, viewport.width, viewport.height);
});
```

```css
.hero {
  /* Steady: follows the large viewport, so it does not jump as toolbars move. */
  height: var(--plumb-height, 100lvh);
}
.sheet {
  /* Sits above the on-screen keyboard. */
  bottom: var(--plumb-keyboard, 0px);
}
```

With GSAP ScrollTrigger (GSAP stays an optional peer; you pass in the ScrollTrigger you
already use):

```ts
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createPlumb } from "@quartifex/plumb";
import { syncScrollTrigger } from "@quartifex/plumb/gsap";

gsap.registerPlugin(ScrollTrigger);
const stop = syncScrollTrigger(createPlumb(), ScrollTrigger);
```

React:

```tsx
import { usePlumb } from "@quartifex/plumb/react";

export function Readout() {
  const viewport = usePlumb(); // null during server rendering
  return <p>{viewport ? `${viewport.width} x ${viewport.height}` : null}</p>;
}
```

## API

| Export | Kind | Description |
| --- | --- | --- |
| `createPlumb(options?)` | function | Start watching. Returns a `Plumb`. One instance per page is enough |
| `plumb.viewport` | `Viewport` | The latest measurement |
| `plumb.subscribe(fn, { all? })` | method | `fn(viewport, change)` once per settled layout change; with `all: true` also for toolbar and keyboard movement, at most once per frame. Returns an unsubscribe |
| `plumb.refresh()` | method | Measure now and emit a `resize` (e.g. after fonts load) |
| `plumb.destroy()` | method | Remove listeners, probes and CSS variables |
| `classify(prev, next, threshold?)` | function | The rule set, pure: `"none" \| "toolbar" \| "keyboard" \| "resize" \| "orientation" \| "dpr" \| "posture"` |
| `isLayoutChange(kind)` | function | True for `resize`, `orientation`, `dpr`, `posture` |
| `syncScrollTrigger(plumb, ScrollTrigger)` (`/gsap`) | function | Hand ScrollTrigger's resize refresh to plumb; returns a function that restores it |
| `usePlumb({ all? })` (`/react`) | hook | The viewport, re-rendering on layout changes (or every change with `all`) |
| `useViewportChange(fn)` (`/react`) | hook | Run `fn` once per layout change, without re-rendering |
| `Viewport`, `ChangeKind`, `Options`, `PlumbWindow` | types | |

**Options:** `target` (element for the CSS variables, default `<html>`; `null` for none),
`debounce` (ms, default 150), `threshold` (px of noise to ignore, default 2), `maxToolbar`
(largest swing treated as toolbars where it cannot be measured, default 160), `height`
(`"large"` or `"small"`, which one `--plumb-height` follows), `window` (a stand-in, for tests
and simulations), `probe`.

**CSS variables:** `--plumb-width`, `--plumb-height`, `--plumb-vh` (1% of the stable height),
`--plumb-svh`, `--plumb-lvh`, `--plumb-dvh`, `--plumb-keyboard`, `--plumb-dpr`, and the
attributes `data-plumb-orientation` and `data-plumb-posture`.

## How it decides

- Small and large viewport heights come from hidden `100svh` and `100lvh` probes where the
  browser supports those units. Elsewhere, on touch devices, we learn them as the smallest
  and largest heights seen at the current width, within a toolbar-sized swing.
- The keyboard is the gap between the layout viewport and the visual viewport, counted
  only at pinch-zoom scale 1.
- Movement is compared with the last reported state, not the last frame, so a toolbar that
  slides a pixel per frame on a fast display is still reported to `all` listeners.
- Layout changes are compared with the last emitted layout, so a resize that takes many
  frames emits once, and toolbars that move and come back never emit a layout change.
- Folding uses the Viewport Segments API (`window.viewport.segments`) and the
  `horizontal-viewport-segments` / `vertical-viewport-segments` media features.

## Reduced motion

plumb animates nothing. It only reports measurements, so there is nothing to reduce; your
own transitions on its variables should still respect `prefers-reduced-motion`.

## Browser support

Current Chrome, Edge, Firefox and Safari, desktop and mobile. `visualViewport` (all current
browsers) gives the keyboard height; without it the keyboard reads as 0. Without
`svh`/`lvh` support the heights are learned, as described above. Fold posture needs the
Viewport Segments API (Chromium on foldables); elsewhere posture is always `continuous`.

## Size

Budgets are enforced in CI by `size-limit` (brotli, unminified ESM as published): core under
3.5 kB, React adapter under 1 kB, GSAP adapter under 0.5 kB.

## Limitations

- Keyboard height is an estimate from the visual viewport; with pinch zoom active it reads 0.
- Learned heights (browsers without `svh`/`lvh`) start equal and widen the first time the
  toolbars move, so `--plumb-height` can grow once early on.
- Only the page viewport is watched. For an element's size, use `ResizeObserver` (or
  `@quartifex/safeframe`, which does).
- The shared React instance writes variables to `<html>`; create your own instance if you
  need a different target.

## Licence

MIT.
