# @quartifex/__NAME__

TODO: one paragraph, in our voice ("we"), on what __NAME__ does and the problem it removes.

**Support level:** experimental <!-- flagship | maintained | experimental -->

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/__NAME__
```

```ts
import { create } from "@quartifex/__NAME__";

const instance = create(document.querySelector("#target")!);
// later
instance.destroy();
```

React:

```tsx
import { useInstance } from "@quartifex/__NAME__/react";

export function Example() {
  const ref = useInstance<HTMLDivElement>();
  return <div ref={ref} />;
}
```

GSAP is an optional peer dependency: install it only if you use the GSAP-driven paths.

## API

| Export | Kind | Description |
| --- | --- | --- |
| `create(target, options?)` | function | TODO |
| `prefersReducedMotion()` | function | Whether the visitor has asked for reduced motion |
| `Options`, `Instance` | types | TODO |
| `useInstance(options?)` (`/react`) | hook | Attach to an element for the component's lifetime |

## Reduced motion

TODO: state exactly what changes under `prefers-reduced-motion: reduce`. Nothing may be
conveyed by motion alone.

## Browser support

TODO: the browsers we test, and what happens on anything older.

## Size

Budgets are enforced in CI by `size-limit`: core under 3 kB, React adapter under 1 kB
(update this line when the budget changes).

## Limitations

TODO: what it does not do. Be specific and honest.

## Licence

MIT.
