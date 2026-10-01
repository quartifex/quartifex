import { type ComponentType, type LazyExoticComponent, lazy } from "react";

// Live demos, keyed by catalog name. `pnpm new:lib <name>` adds an entry above the
// marker; an item without an entry shows its catalog facts only.
export const demos: Record<string, LazyExoticComponent<ComponentType> | undefined> = {
  plumb: lazy(() => import("./plumb")),
  safeframe: lazy(() => import("./safeframe")),
  dailies: lazy(() => import("./dailies")),
  contactsheet: lazy(() => import("./contactsheet")),
  rushes: lazy(() => import("./rushes")),
  resolve: lazy(() => import("./resolve")),
  reel: lazy(() => import("./reel")),
  stillness: lazy(() => import("./stillness")),
  dolly: lazy(() => import("./dolly")),
  anatomy: lazy(() => import("./anatomy")),
  heft: lazy(() => import("./heft")),
  spine: lazy(() => import("./spine")),
  viewfinder: lazy(() => import("./viewfinder")),
  // demos:end
};

// `lazy` is used by generated entries.
void lazy;
