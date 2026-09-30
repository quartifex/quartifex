// @ts-check
// Generators behind `pnpm new:lib <name>` and `pnpm new:site <name>`. They copy a
// template, fill in the catalog facts, and wire the new package into the repo so it
// starts from the definition of done rather than from an empty folder.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const NAME = /^[a-z][a-z0-9-]*$/;

/**
 * @typedef {{ id: string, kind: string, name: string, category?: string | null,
 *   description?: string | null, label?: string | null, host?: string | null, state: string }} Entry
 */

/** @param {string} root @returns {Entry[]} */
function readCatalog(root) {
  return JSON.parse(readFileSync(path.join(root, "catalog", "catalog.json"), "utf8"));
}

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/**
 * Copy a template folder to `dest`, replacing `__KEY__` tokens in file contents and names.
 * @param {string} from @param {string} dest @param {Record<string, string>} values
 */
function copyTemplate(from, dest, values) {
  const fill = (/** @type {string} */ text) =>
    Object.entries(values).reduce((out, [key, value]) => out.replaceAll(`__${key}__`, value), text);
  if (statSync(from).isFile()) {
    writeFileSync(dest, fill(readFileSync(from, "utf8")));
    return;
  }
  cpSync(from, dest, { recursive: true });
  for (const file of walk(dest)) {
    writeFileSync(file, fill(readFileSync(file, "utf8")));
  }
}

/**
 * @param {string} root @param {string} name @param {"lib" | "site"} kind
 * @returns {Entry}
 */
function resolve(root, name, kind) {
  if (!NAME.test(name))
    throw new Error(`"${name}" is not a valid name (lowercase letters, digits, hyphens)`);
  const entry = readCatalog(root).find((item) => item.name === name);
  if (!entry) throw new Error(`"${name}" is not in catalog/catalog.json. Add it there first.`);
  if (entry.kind !== kind)
    throw new Error(`"${name}" is a ${entry.kind} in the catalog, not a ${kind}`);
  return entry;
}

/** Mark the item as started. Marking it `built` is a manual step once `pnpm check` is green. */
function markInProgress(/** @type {string} */ root, /** @type {string} */ name) {
  const file = path.join(root, "catalog", "catalog.json");
  const catalog = readCatalog(root);
  const entry = catalog.find((item) => item.name === name);
  if (entry && entry.state === "not started") {
    entry.state = "in progress";
    writeFileSync(file, `${JSON.stringify(catalog, null, 1)}\n`);
  }
}

/**
 * Create `packages/<name>` from templates/lib, a demo stub in the hub, and a changeset.
 * @param {string} root @param {string} name @returns {{ dir: string, created: string[] }}
 */
export function newLib(root, name) {
  const entry = resolve(root, name, "lib");
  const dir = path.join(root, "packages", name);
  if (existsSync(dir)) throw new Error(`packages/${name} already exists`);

  copyTemplate(path.join(root, "templates", "lib"), dir, {
    NAME: name,
    ID: entry.id,
    CATEGORY: entry.category ?? "Uncategorised",
  });

  const demos = path.join(root, "apps", "lab", "src", "demos");
  mkdirSync(demos, { recursive: true });
  const demo = path.join(demos, `${name}.tsx`);
  copyTemplate(path.join(root, "templates", "demo.tsx"), demo, { NAME: name });
  registerDemo(path.join(demos, "index.ts"), name);

  const changeset = path.join(root, ".changeset", `${name}-initial.md`);
  writeFileSync(
    changeset,
    `---\n"@quartifex/${name}": minor\n---\n\nFirst release of \`@quartifex/${name}\`.\n`,
  );

  markInProgress(root, name);
  return { dir, created: [dir, demo, changeset] };
}

/**
 * Create `apps/<name>` from templates/site and give it a budget entry.
 * @param {string} root @param {string} name @returns {{ dir: string, created: string[] }}
 */
export function newSite(root, name) {
  const entry = resolve(root, name, "site");
  const dir = path.join(root, "apps", name);
  if (existsSync(dir)) throw new Error(`apps/${name} already exists`);

  copyTemplate(path.join(root, "templates", "site"), dir, {
    NAME: name,
    ID: entry.id,
    LABEL: entry.label ?? "Personal Concept",
    HOST: entry.host ?? `${name}.quartifex.com`,
    CATEGORY: entry.category ?? "Proof site",
  });

  const budgetFile = path.join(root, "budget.json");
  const budget = JSON.parse(readFileSync(budgetFile, "utf8"));
  if (!budget.apps.some((/** @type {{ app: string }} */ app) => app.app === name)) {
    budget.apps.push({ ...budget.template, app: name });
    writeFileSync(budgetFile, `${JSON.stringify(budget, null, 2)}\n`);
  }

  markInProgress(root, name);
  return { dir, created: [dir] };
}

/** Add `name` to the hub demo registry (apps/lab/src/demos/index.ts). */
function registerDemo(/** @type {string} */ file, /** @type {string} */ name) {
  const marker = "// demos:end";
  const source = readFileSync(file, "utf8");
  if (source.includes(`"${name}":`)) return;
  const entry = `"${name}": lazy(() => import("./${name}")),`;
  writeFileSync(
    file,
    source.replace(
      marker,
      `${entry}
  ${marker}`,
    ),
  );
}
