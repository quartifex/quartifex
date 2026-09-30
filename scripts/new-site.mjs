// @ts-check
// pnpm new:site <name>  ->  apps/<name> with its honest label and a budget entry.
import path from "node:path";
import { newSite } from "./lib/scaffold.mjs";

const name = process.argv[2];
if (!name) {
  console.error("Usage: pnpm new:site <name>   (the name must exist in catalog/catalog.json)");
  process.exit(1);
}

try {
  const root = path.join(import.meta.dirname, "..");
  const { created } = newSite(root, name);
  console.log(`Created apps/${name}:`);
  for (const file of created) console.log(`  ${path.relative(root, file)}`);
  console.log(
    "\nNext: pnpm install, build it to the definition of done in CONTRIBUTING.md, then pnpm check.",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
