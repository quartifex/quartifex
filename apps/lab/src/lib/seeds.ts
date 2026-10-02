import { execFileSync } from "node:child_process";
import path from "node:path";
import { byKind, type CatalogItem, hrefFor, isBuilt } from "./catalog";

// Lab seeds as the gallery at /lab shows them. The catalog gives seeds no category, and it
// stays a copy of the docs, so the gallery tags them here, in the libraries' vocabulary.
export const SEED_TAGS: Record<string, string> = {
  LB01: "Shaders",
  LB02: "Shaders",
  LB03: "Shaders",
  LB04: "3D / R3F",
  LB05: "Shaders",
  LB06: "Scroll & sequence",
  LB07: "UX primitives",
  LB08: "Scroll & sequence",
  LB09: "Scroll & sequence",
  LB10: "3D / R3F",
  LB11: "Scroll & sequence",
  LB12: "3D / R3F",
  LB13: "Responsive scenes",
  LB14: "Responsive scenes",
};

/** "New" means added within the last two weekly Lab drops. */
export const NEW_WINDOW_DAYS = 14;

const REPO_ROOT = path.join(process.cwd(), "..", "..");

/**
 * When a seed's folder first appeared in git (its first commit), or null when git or the
 * history is not available, e.g. a shallow clone on a build server: then nothing is marked
 * new rather than everything.
 */
export function addedAt(name: string): Date | null {
  try {
    const out = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--format=%cI", "--", `apps/lab/src/seeds/${name}`],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    const first = out.split("\n").filter(Boolean).at(-1);
    return first ? new Date(first) : null;
  } catch {
    return null;
  }
}

export function isNew(added: Date | null, now: Date = new Date()): boolean {
  if (!added) return false;
  const days = (now.getTime() - added.getTime()) / 86_400_000;
  return days >= 0 && days <= NEW_WINDOW_DAYS;
}

export type SeedEntry = {
  id: string;
  name: string;
  description: string;
  tag: string;
  built: boolean;
  isNew: boolean;
  href: string;
  /** For seeds without a poster yet. */
  icon: string;
};

export function seedEntries(iconFor: (item: CatalogItem) => string): SeedEntry[] {
  const now = new Date();
  return byKind("lab").map((item) => {
    const built = isBuilt(item);
    return {
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      tag: SEED_TAGS[item.id] ?? "Lab",
      built,
      isNew: built && isNew(addedAt(item.name), now),
      href: hrefFor(item),
      icon: iconFor(item),
    };
  });
}
