# @quartifex/understudy

Steps in when the lead can't perform. Our rule for scrollytelling is that every WebGL scene
needs a fallback, and the fallback has to be planned, not improvised on the day a client opens
the site on an old phone. understudy makes the plan a contract: a ladder of rungs (WebGL, then
the image sequence, then the poster) and a ladder of quality steps within WebGL (post-processing,
pixel ratio, shadows, particles). It picks the starting rung and step from the device, watches
the frame rate while the scene runs, steps quality down when frames are slow and back up (a
limited number of times) when they recover, and hands off to `@quartifex/reel` at the same
scroll position when the lowest WebGL quality still cannot keep up or the context is lost. It
never climbs back to WebGL on its own; a visitor or your code can ask it to try again.

drei's `PerformanceMonitor` and detect-gpu cover parts of this. The ladder contract, the
reasons log and the hand-off to an image sequence are what we add.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/understudy @quartifex/reel three @react-three/fiber
```

```tsx
import { Ladder, useUnderstudy } from "@quartifex/understudy/react";
import { Governor, useQuality } from "@quartifex/understudy/r3f";
import { createStandIn } from "@quartifex/understudy/reel";

function Hero({ manifest }) {
  const [state, understudy] = useUnderstudy(); // all three rungs, default ladder
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!understudy || !canvas.current) return;
    const standIn = createStandIn(canvas.current, manifest, {
      baseUrl: "/sequences/hero/",
      understudy,
      progress: () => scrollProgress.current,
    });
    return () => standIn.destroy();
  }, [understudy, manifest]);

  return (
    <>
      <Ladder
        state={state}
        webgl={
          <Canvas shadows>
            <Governor understudy={understudy!} />
            <Scene understudy={understudy!} />
          </Canvas>
        }
        sequence={null}
        poster={null}
      />
      <canvas ref={canvas} hidden={state?.rung === "webgl"} />
    </>
  );
}

function Scene({ understudy }) {
  const { particles, post } = useQuality(understudy); // dpr and shadows are applied for you
  // ...
}
```

Without React: `createUnderstudy(readEnvironment(), contract)`, call `frame(ms)` every frame,
`subscribe` to changes, and `watchContext(canvas, understudy)` for context loss.

## The contract

| Field | Default | Meaning |
| --- | --- | --- |
| `rungs` | `["webgl", "sequence", "poster"]` | What this scene ships; missing rungs are skipped |
| `steps` | `defaultSteps(maxDpr)` | Full, no post-processing, pixel ratio 1.5, no shadows, pixel ratio 1, half the particles, minimum (0.75, a quarter) |
| `maxDpr` | device, capped at 2 | Highest pixel ratio |
| `start` | tier 3: Full, 2: no post, 1: no shadows, 0: pixel ratio 1, unknown: no post | Starting step by GPU tier |
| `fps.window` | 1000 ms | Measuring window |
| `fps.low` / `fps.high` | 0.75 / 0.95 | Slow and smooth, as fractions of the refresh rate |
| `fps.patience` / `fps.recover` | 2 / 5 windows | Before a step down / up |
| `fps.maxRecoveries` | 2 | Steps back up allowed, so a borderline scene cannot flap |
| `fps.warmup` | 1 window | Ignored after start and after every change |
| `fps.hitch` | 250 ms | Longer frames (a stall, a sleeping tab) drop the window |
| `fps.refresh`, `fps.minRefresh` | estimated, at least 60 | The display's rate |
| `demoteAfter` | 3 windows | Slow windows at the lowest step before the hand-off |
| `reducedMotion` | `"poster"` | Or `"sequence"` (reel shows its poster) or `"keep"` |
| `saveData` | `"sequence"` | On Save-Data or 2G; or `"poster"`, `"keep"` |

Starting rung: no WebGL, software-only WebGL (`failIfMajorPerformanceCaveat`) or GPU tier 0
start on the sequence; Save-Data and 2G follow `saveData`; reduced motion follows
`reducedMotion`. Every decision is written to `state.reasons` in plain words.

## API

| Export | Kind | Description |
| --- | --- | --- |
| `createUnderstudy(env, contract?)` | function | The governor: `state`, `frame(ms)`, `demote(reason)`, `retry()`, `setReducedMotion(on)`, `subscribe(fn)` |
| `chooseRung(env, contract?)` | function | The starting rung and why. Pure |
| `defaultSteps(maxDpr)`, `qualityAt(steps, step)` | functions | The ladder and the quality at a step |
| `readEnvironment(gpuTier?)`, `detectWebGL()` | functions | This browser's environment |
| `watchContext(canvas, understudy)` | function | Demote on `webglcontextlost` |
| `useUnderstudy(contract?, overrides?)`, `<Ladder>` (`/react`) | hook, component | The governor for a component's lifetime; render the current rung |
| `<Governor understudy frameTime?>`, `useQuality(understudy)` (`/r3f`) | component, hook | Inside the Canvas: feeds frame times, applies pixel ratio and shadows, watches the context |
| `createStandIn(canvas, manifest, options)` (`/reel`) | function | A reel that takes over at the same position: the sequence, or its poster on the last rung |
| `getGpuTier()` (`/gpu`) | function | detect-gpu's tier through `@quartifex/resolve/gpu` |
| `Rung`, `Quality`, `Step`, `Environment`, `Contract`, `State` | types | |

## Reduced motion

By default reduced motion puts the scene on the poster rung: no real-time 3D, no sequence
scrubbing, the poster from the reel manifest. `"sequence"` gives the same visible result
through reel (which shows its poster under reduced motion); `"keep"` leaves the decision to
you. Changes are announced through `state.reasons`, which the Lab demo shows in a polite live
region, so no information depends on seeing the scene change.

## Browser support

Everything with WebGL, `requestAnimationFrame` and `matchMedia`. `navigator.connection`
(Save-Data, effective type) exists in Chromium browsers only; elsewhere those rules do not apply.

## Size

Enforced in CI (brotli, unminified ESM): core under 4 kB, React adapter, R3F governor and reel
hand-off under 1 kB each, GPU entry under 0.5 kB.

## Limitations

- Frame rate is a proxy. A scene can hold 60 fps and still drain a battery; understudy does not
  read power or thermal state (browsers do not expose them).
- The refresh rate is estimated from the fastest frames and assumed to be at least 60 Hz unless
  you set `fps.refresh`; on a true 30 Hz screen, set it.
- Post-processing and particle counts are signals for your scene to act on (`useQuality`); only
  pixel ratio and shadows are applied automatically.
- It never returns to WebGL by itself after a hand-off, by design: flipping between a 3D scene
  and a sequence mid-scroll is worse than staying on the sequence.

## Acknowledgments

The `/r3f` governor builds on [react-three-fiber](https://github.com/pmndrs/react-three-fiber), and `/gpu` reads the GPU tier with [detect-gpu](https://github.com/pmndrs/detect-gpu), both by [Poimandres (pmndrs)](https://github.com/pmndrs), optional peers. Thank you.

## Licence

MIT.
