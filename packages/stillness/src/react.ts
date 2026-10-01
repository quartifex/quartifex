// React adapter for @quartifex/stillness, published as `@quartifex/stillness/react`.
import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createStillness,
  type EffectDefinition,
  type Level,
  type Options,
  type Stillness,
} from "./index.js";

const Context = createContext<Stillness | null>(null);

/** One policy for the page. Children read it with `useStillness` and `useMotionEffect`. */
export function StillnessProvider({
  children,
  options,
}: {
  children: ReactNode;
  options?: Options;
}) {
  const [instance, setInstance] = useState<Stillness | null>(null);
  const initial = useRef(options);
  useEffect(() => {
    const created = createStillness(initial.current);
    setInstance(created);
    return () => created.destroy();
  }, []);
  return createElement(Context.Provider, { value: instance }, children);
}

/**
 * The policy and its current level. Until the provider has mounted (and on the server)
 * the level is "static": the safe default that never animates.
 */
export function useStillness(): { stillness: Stillness | null; level: Level } {
  const stillness = useContext(Context);
  const level = useSyncExternalStore(
    (onChange) => stillness?.subscribe(onChange) ?? (() => {}),
    () => stillness?.level ?? "static",
    () => "static" as Level,
  );
  return { stillness, level };
}

/** Register an effect with the page policy for the component's lifetime. */
export function useMotionEffect(definition: EffectDefinition): Level {
  const { stillness, level } = useStillness();
  const latest = useRef(definition);
  latest.current = definition;
  const { name, heavy } = definition;
  const [running, setRunning] = useState<Level>("static");
  useEffect(() => {
    if (!stillness) return;
    const handle = stillness.effect({
      name,
      ...(heavy === undefined ? {} : { heavy }),
      full: () => latest.current.full(),
      reduced: () => (latest.current.reduced ?? latest.current.static)?.(),
      static: () => latest.current.static?.(),
    });
    setRunning(handle.running);
    const off = stillness.subscribe(() => setRunning(handle.running));
    return () => {
      off();
      handle.destroy();
    };
  }, [stillness, name, heavy]);
  return stillness ? running : level;
}
