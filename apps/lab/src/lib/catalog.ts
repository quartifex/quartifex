import { readFileSync } from "node:fs";
import path from "node:path";

// The catalog is the single source of truth for what exists. It is read from the
// repo root at build time and validated here, at the boundary, so the rest of the
// app works with a trusted type.

export type Kind = "lib" | "site" | "lab";

export type CatalogItem = {
  id: string;
  kind: Kind;
  name: string;
  order: number;
  state: string;
  prompt: string;
  category: string | null;
  description: string | null;
  effort: string | null;
  host: string | null;
  label: string | null;
  /** Ids of items this one depends on. */
  deps: string[];
  /** Ids of libraries a site is built with. */
  libs: string[];
};

export const KIND_LABEL: Record<Kind, string> = { lib: "Libraries", site: "Sites", lab: "Lab" };
export const KIND_ORDER: Kind[] = ["lib", "site", "lab"];

const REPO_ROOT = path.join(process.cwd(), "..", "..");
export const CATALOG_PATH = path.join(REPO_ROOT, "catalog", "catalog.json");
export const ICON_DIR = path.join(REPO_ROOT, "assets", "icons", "svg");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKind(value: unknown): value is Kind {
  return value === "lib" || value === "site" || value === "lab";
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function required(record: Record<string, unknown>, key: string, where: string): string {
  const value = text(record[key]);
  if (value === null) throw new Error(`catalog: ${where} is missing "${key}"`);
  return value;
}

function idList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  // Sites list their libraries as a comma-separated string ("L01, L02").
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part !== "");
  }
  return [];
}

export function parseCatalog(raw: unknown): CatalogItem[] {
  if (!Array.isArray(raw)) throw new Error("catalog: expected an array");
  return raw.map((entry, index) => {
    const where = `item ${index}`;
    if (!isRecord(entry)) throw new Error(`catalog: ${where} is not an object`);
    const kind = entry.kind;
    if (!isKind(kind)) throw new Error(`catalog: ${where} has an unknown kind`);
    const order = entry.order;
    if (typeof order !== "number") throw new Error(`catalog: ${where} is missing "order"`);
    return {
      id: required(entry, "id", where),
      kind,
      name: required(entry, "name", where),
      order,
      state: required(entry, "state", where),
      prompt: required(entry, "prompt", where),
      category: text(entry.category),
      description: text(entry.description),
      effort: text(entry.effort),
      host: text(entry.host),
      label: text(entry.label),
      deps: idList(entry.deps),
      libs: idList(entry.libs),
    };
  });
}

let cached: CatalogItem[] | undefined;

export function getCatalog(): CatalogItem[] {
  cached ??= parseCatalog(JSON.parse(readFileSync(CATALOG_PATH, "utf8")));
  return cached;
}

export function getItem(name: string): CatalogItem | undefined {
  return getCatalog().find((item) => item.name === name);
}

export function getById(id: string): CatalogItem | undefined {
  return getCatalog().find((item) => item.id === id);
}

/** Items of one kind, in build order. */
export function byKind(kind: Kind): CatalogItem[] {
  return getCatalog()
    .filter((item) => item.kind === kind)
    .sort((a, b) => a.order - b.order);
}

export function isBuilt(item: CatalogItem): boolean {
  return item.state === "built" || item.state === "reviewed";
}

/** The icon's SVG markup. Icons carry their own animation, hover palette and reduced-motion rule. */
export function getIconSvg(item: CatalogItem): string {
  return readFileSync(path.join(ICON_DIR, `${item.id}-${item.name}.svg`), "utf8");
}
