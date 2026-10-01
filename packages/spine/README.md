# @quartifex/spine

Lenis, GSAP ScrollTrigger and the Next.js App Router, wired together once. Every studio
hand-rolls this and the forum threads show how often it goes wrong: two tickers fighting,
refresh storms on mobile toolbars, pins left behind after a route change, a page that jumps
after the tab wakes up. spine does it in one place: GSAP's ticker drives Lenis, Lenis tells
ScrollTrigger when it scrolls, ScrollTrigger refreshes only on real layout changes (through
`plumb`), after a tab sleeps and after a route change, and route-scoped animations are torn
down newest first so pins come apart cleanly.

**Support level:** flagship

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/spine gsap lenis
```

```tsx
// app/layout.tsx (client component)
"use client";
import "lenis/dist/lenis.css";
import { createPlumb } from "@quartifex/plumb";
import { SpineRouteSync } from "@quartifex/spine/next";
import { SpineProvider } from "@quartifex/spine/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useState } from "react";

gsap.registerPlugin(ScrollTrigger);

export function Providers({ children }: { children: React.ReactNode }) {
  const [plumb] = useState(() => createPlumb());
  return (
    <SpineProvider gsap={gsap} ScrollTrigger={ScrollTrigger} Lenis={Lenis} plumb={plumb}>
      <SpineRouteSync />
      {children}
    </SpineProvider>
  );
}
```

```tsx
// any component
import { useSpineScope } from "@quartifex/spine/react";

useSpineScope(() => {
  gsap.to(".title", { y: -80, scrollTrigger: { trigger: ".hero", scrub: true } });
  ScrollTrigger.create({ trigger: ".scene", pin: true, end: "+=200%" });
}, []);
```

Without React: `const spine = createSpine({ gsap, ScrollTrigger, Lenis, plumb })`, then call
`spine.route(location.pathname)` on navigation and create animations inside `spine.scope(fn)`.

## API

| Export | Kind | Description |
| --- | --- | --- |
| `createSpine(options)` | function | Returns `lenis`, `refresh(reason?)`, `route(key)`, `scope(fn, element?)`, `scrollTo(target)`, `stats()`, `destroy()` |
| `SpineProvider`, `useSpine`, `useSpineScope(fn, deps)` (`/react`) | component, hooks | |
| `SpineRouteSync({ search? })` (`/next`) | component | Calls `spine.route` on App Router navigations; `search` counts query changes too |
| `GsapLike`, `ScrollTriggerLike`, `LenisLike`, `SpineStats` | types | |

**Options:** `gsap`, `ScrollTrigger`, `Lenis` (the class; leave out for native scroll),
`lenis` (its options; `autoRaf` is always off), `plumb`, `reducedMotion`, `sleepAfterMs`
(default 1000).

## What it does

- **One ticker.** `gsap.ticker` drives `lenis.raf`; `lagSmoothing(0)`; Lenis' scroll calls
  `ScrollTrigger.update`.
- **Refresh, but only when it matters.** With plumb, ScrollTrigger's own resize refresh is off
  and spine refreshes once per settled layout change: never on mobile toolbar movement, once on
  a rotation. Refreshes are coalesced to one per frame.
- **Tab sleep.** After a tab is hidden for longer than `sleepAfterMs`, sizes are re-measured and
  ScrollTrigger refreshed on return.
- **Routes.** On a new route: scoped contexts are reverted newest first, scroll memory is
  cleared, the page goes to the top, and ScrollTrigger refreshes two frames later, after the new
  route has laid out.
- **Stats.** `stats()` reports Lenis on or off, ticker functions, triggers, pins, scopes, route
  and the last refresh reasons, which `viewfinder` can show.

## Reduced motion

Under `prefers-reduced-motion: reduce` spine does not create Lenis: scrolling is native, with no
smoothing. ScrollTrigger still works, so pinned scenes still pin; pair it with `stillness` to
choose what those scenes do.

## Browser support

All current browsers that Lenis and GSAP support. The tab-sleep handling uses the Page
Visibility API.

## Size

Enforced in CI (brotli, unminified ESM): core under 2 kB, React adapter under 1 kB, Next.js
adapter under 0.75 kB. GSAP and Lenis are optional peers; spine never imports them.

## Limitations

- Animations created outside `scope` / `useSpineScope` are not torn down on route changes.
- Nested scroll containers (a Lenis instance on an element) are not managed: one page scroller
  per spine.
- The Pages Router is not covered by `/next`; call `spine.route` from `router.events` yourself.

## Licence

MIT. GSAP and Lenis carry their own licences (see `licence-check.md` for GSAP).
