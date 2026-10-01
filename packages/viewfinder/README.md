# @quartifex/viewfinder

A devtools overlay for scrollytelling. GSAP ships markers and nothing else; when a scroll scene
misbehaves you want to see which chapter you are in, how far each scene has progressed, which
frame the sequence is showing and how much of it is in memory, whether frames are dropping,
and to replay the exact scroll that broke it. viewfinder shows all of that in a panel isolated
in a Shadow DOM, and records and replays scroll paths for comparisons and clean screen
recordings.

**Support level:** experimental

## Quickstart (60 seconds)

```sh
pnpm add -D @quartifex/viewfinder
```

```ts
import { createViewfinder } from "@quartifex/viewfinder";
import { gsapSource } from "@quartifex/viewfinder/gsap";
import { reelSource } from "@quartifex/viewfinder/reel";

if (process.env.NODE_ENV !== "production") {
  createViewfinder({
    sources: [gsapSource(ScrollTrigger), reelSource(reel, "hero")],
    scroller: spine, // optional: jump with Lenis instead of the window
  });
}
```

Alt+V shows and hides it.

React:

```tsx
import { useViewfinder } from "@quartifex/viewfinder/react";

const sources = useMemo(() => [gsapSource(ScrollTrigger)], []);
useViewfinder({ sources }, process.env.NODE_ENV !== "production");
```

## The panel

| Section | Shows |
| --- | --- |
| Chapters | Every `[data-chapter]` element, the one in view marked, click to jump |
| Scenes | Each source's scenes (every ScrollTrigger, every reel) with progress bars |
| Sequences | Frame shown, frames in memory as a strip, tier, format and pixel ratio |
| Frames | fps, p95, long frames, worst frame, and a graph of the last 120 frame times |
| Tools | Trigger markers (start and end lines for every scene), record, replay, copy the path as JSON |

## API

| Export | Kind | Description |
| --- | --- | --- |
| `createViewfinder(options?)` | function | Mount. Returns `open`, `toggle`, `showMarkers`, `record`, `stop`, `replay(path?)`, `path`, `destroy` |
| `gsapSource(ScrollTrigger)` (`/gsap`) | function | Scenes from every ScrollTrigger |
| `reelSource(reel, label?)` (`/reel`) | function | A sequence reading from a reel |
| `useViewfinder(options?, enabled?)` (`/react`) | hook | |
| `positionAt`, `compact`, `parseScrollPath`, `duration`, `frameStats` | functions | Scroll paths and frame statistics, pure |
| `Source`, `Reading`, `Scene`, `SequenceReading`, `ScrollPath` | types | Write your own source: `{ name, read() }` |

**Options:** `sources`, `chapters` (selector), `scroller` (a spine, for Lenis-aware jumps),
`hotkey` (with Alt; default `v`, matched by physical key), `open`, `side`.

## Reduced motion

The panel does not animate: values update in place four times a second, and the frame graph
redraws bars. Replay scrolls the page by design, because reproducing a scroll is its purpose;
it only runs when you press it.

## Browser support

Current Chrome, Edge, Firefox and Safari (Shadow DOM, `requestAnimationFrame`). Clipboard copy
needs a secure context.

## Size

A development tool; budgets are still enforced (brotli, unminified ESM): overlay under 6 kB,
each source under 0.5 kB, React hook under 0.5 kB.

## Limitations

- Replay drives `window.scrollTo`; pages that scroll an inner container replay the window only.
- Markers use each scene's `start` and `end` in page pixels; scenes inside a scrolled container
  are drawn relative to the window.
- The overlay reads sources every 250 ms; very short events between reads are not shown.

## Licence

MIT.
