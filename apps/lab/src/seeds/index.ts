import { type ComponentType, type LazyExoticComponent, lazy } from "react";

// Lab seeds with a finished page, keyed by catalog name. Shown at /lab/<name>.
export const seeds: Record<string, LazyExoticComponent<ComponentType> | undefined> = {
  frameguide: lazy(() => import("./frameguide")),
  "aspect-morph": lazy(() => import("./aspect-morph")),
};
