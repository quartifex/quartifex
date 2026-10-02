// The accessibility audit shown on the page: axe-core and Lighthouse, run against the
// production build in each motion level by scripts/audit.mjs (in CI on every push to main,
// which publishes reports/halcyon/audit.json). Read at build time.
import { readFileSync } from "node:fs";
import path from "node:path";

export type Violation = { id: string; impact: string | null; help: string; nodes: number };

export type ModeResult = {
  axe: { violations: Violation[]; passes: number; incomplete: number };
  lighthouse: {
    accessibility: number;
    "best-practices": number;
    seo: number;
    performance: number;
  } | null;
};

export type Audit = {
  createdAt: string;
  commit: string | null;
  environment: { kind: "ci" | "local"; name: string; runUrl?: string };
  tools: { axe: string; lighthouse: string | null };
  tags: string[];
  modes: Record<"full" | "reduced" | "static", ModeResult>;
};

export const AUDIT_FILE = path.join(process.cwd(), "..", "..", "reports", "halcyon", "audit.json");

export function readAudit(file = AUDIT_FILE): Audit | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Audit;
  } catch {
    return null;
  }
}
