export type Scaffolded = { dir: string; created: string[] };
export function newLib(root: string, name: string): Scaffolded;
export function newSite(root: string, name: string): Scaffolded;
