import { type ComponentType, type LazyExoticComponent, lazy } from "react";

// Lab seeds with a finished page, keyed by catalog name. Shown at /lab/<name>.
export const seeds: Record<string, LazyExoticComponent<ComponentType> | undefined> = {
  frameguide: lazy(() => import("./frameguide")),
  "aspect-morph": lazy(() => import("./aspect-morph")),
  blendframes: lazy(() => import("./blendframes")),
  glint: lazy(() => import("./glint")),
  grain: lazy(() => import("./grain")),
  halftone: lazy(() => import("./halftone")),
  "ink-dissolve": lazy(() => import("./ink-dissolve")),
  "lit-grid": lazy(() => import("./lit-grid")),
  odometer: lazy(() => import("./odometer")),
  "mini-explode": lazy(() => import("./mini-explode")),
  velocity: lazy(() => import("./velocity")),
  "label-peel": lazy(() => import("./label-peel")),
  "draw-path": lazy(() => import("./draw-path")),
  "logo-extrude": lazy(() => import("./logo-extrude")),
};
