# @quartifex/stillness

A motion policy for cinematic pages. Reduced-motion advice exists; a drop-in policy layer for
pinned scenes did not. With stillness every effect declares what it does at three levels
(full, reduced, static), and we run the right variant, switching live when the visitor's
system setting, an on-page choice or Save-Data changes. The DOM kit adds what long scroll
pages usually miss: a chapter rail, skip links past pinned scenes, focus management on
arrival, and polite progress announcements.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/stillness
```

```ts
import { createStillness } from "@quartifex/stillness";
import { chapterRail, skipLink } from "@quartifex/stillness/dom";

const stillness = createStillness();

stillness.effect({
  name: "hero parallax",
  full: () => {
    const tween = startParallax();
    return () => tween.kill(); // cleanup runs when the level changes
  },
  reduced: () => fadeIn(),     // gentler: no travel
  static: () => showEndState(), // no motion at all
});

stillness.effect({ name: "hero video", heavy: true, full: playVideo, static: showPoster });

chapterRail(document.querySelector("nav.chapters")!, [
  { id: "intro", label: "Intro" },
  { id: "reveal", label: "Reveal" },
  { id: "specs", label: "Specs" },
], { stillness });

skipLink(document.querySelector("#reveal")!, { label: "Skip the animation", stillness });

// An on-page control:
toggle.addEventListener("change", () => stillness.set(toggle.checked ? "static" : "auto"));
```

React:

```tsx
import { StillnessProvider, useMotionEffect, useStillness } from "@quartifex/stillness/react";

<StillnessProvider><Page /></StillnessProvider>;

function Hero() {
  const level = useMotionEffect({ name: "hero", full: startLoop, static: showFrame });
  const { stillness } = useStillness();
  return <button onClick={() => stillness?.set("static")}>Stop motion ({level})</button>;
}
```

## Levels

| Level | When | Effects run |
| --- | --- | --- |
| `full` | default | `full` |
| `reduced` | `prefers-reduced-motion: reduce`, or chosen | `reduced`, else `static` |
| `static` | chosen on the page | `static`, else nothing |

Effects marked `heavy` (video, long sequences, WebGL) run `static` whenever Save-Data (or
`prefers-reduced-data`) is on, whatever the level. The visitor's on-page choice is remembered
in `localStorage` (`qx-motion`) unless you pass `storageKey: null`.

## API

| Export | Kind | Description |
| --- | --- | --- |
| `createStillness(options?)` | function | The policy: `level`, `preference`, `systemLevel`, `saveData`, `set`, `subscribe`, `effect`, `effects`, `destroy` |
| `stillness.effect(definition)` | method | Register `{ name, heavy?, full, reduced?, static? }`; variants return a cleanup. Returns `{ running, destroy }` |
| `stillness.effects()` | method | Every effect and the variant it runs, for audits and debug panels |
| `resolveLevel`, `levelFor` | functions | The rules, pure |
| `chapterRail(nav, chapters, options?)` (`/dom`) | function | A list of chapter links with `aria-current="step"`, focus on arrival and live announcements |
| `skipLink(scene, options?)` (`/dom`) | function | A "skip" link before a long scene, to what follows it |
| `createAnnouncer(parent?)`, `focusOnArrival(el)`, `goTo(el, stillness?)` (`/dom`) | functions | The pieces, separately |
| `StillnessProvider`, `useStillness`, `useMotionEffect` (`/react`) | components, hooks | |

## Reduced motion

This library is the reduced-motion layer. Two rules it encodes: nothing is ever conveyed by
motion alone (each variant must show the same content), and the static level is always
available to the visitor on the page, not only through system settings. Under anything but
full motion, the rail and skip links jump instead of smooth-scrolling.

## Browser support

All current browsers. `prefers-reduced-motion` everywhere; Save-Data from
`navigator.connection` (Chromium) or `prefers-reduced-data` (where supported). The chapter
rail needs `IntersectionObserver`.

## Size

Enforced in CI (brotli, unminified ESM): core under 2 kB, DOM kit under 2 kB, React adapter
under 1 kB.

## Limitations

- stillness decides which variant runs; writing good reduced and static variants is still
  design work.
- Effects started outside stillness (a library's own autoplay) are not controlled; wrap them.
- The rail marks the chapter crossing the middle of the viewport; very short chapters may be
  skipped over by a fast scroll.
- On the server and before hydration the React hooks report `static`, the safe default.

## Licence

MIT.
