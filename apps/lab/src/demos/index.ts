import { type ComponentType, type LazyExoticComponent, lazy } from "react";

// Live demos, keyed by catalog name. `pnpm new:lib <name>` adds an entry above the
// marker; an item without an entry shows its catalog facts only.
export const demos: Record<string, LazyExoticComponent<ComponentType> | undefined> = {
  // demos:end
};

// `lazy` is used by generated entries.
void lazy;
