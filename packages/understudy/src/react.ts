// React adapter for @quartifex/understudy, published as `@quartifex/understudy/react`.
import { createElement, Fragment, type ReactNode, useEffect, useState } from "react";
import {
  type Contract,
  createUnderstudy,
  type Environment,
  readEnvironment,
  type State,
  type Understudy,
} from "./index.js";

/**
 * A governor for this component's lifetime, created in the browser once mounted (state is
 * null before). It is rebuilt when `environment` overrides change, e.g. a GPU tier arriving.
 */
export function useUnderstudy(
  contract: Contract = {},
  environment: Partial<Environment> = {},
): [State | null, Understudy | null] {
  const [understudy, setUnderstudy] = useState<Understudy | null>(null);
  const [state, setState] = useState<State | null>(null);
  const key = JSON.stringify(environment);
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt on the overrides' content, not identity; the contract is read once
  useEffect(() => {
    const created = createUnderstudy({ ...readEnvironment(), ...environment }, contract);
    setUnderstudy(created);
    setState(created.state);
    return created.subscribe(setState);
  }, [key]);
  return [state, understudy];
}

/** Render the stand-in for the current rung. Nothing renders before the governor exists. */
export function Ladder({
  state,
  webgl,
  sequence,
  poster,
}: {
  state: State | null;
  webgl: ReactNode;
  sequence: ReactNode;
  poster: ReactNode;
}) {
  if (!state) return null;
  return createElement(
    Fragment,
    null,
    state.rung === "webgl" ? webgl : state.rung === "sequence" ? sequence : poster,
  );
}
