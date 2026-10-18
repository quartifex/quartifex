// Only loaded in demo mode (/app?demo=1), which uses its own database.
import type { Locale } from "../i18n";
import { readStoredLocale } from "../i18n";
import { db, importTables, isDemo, wipeAll } from "../lib/db";
import { demoTables } from "../lib/demo";

export async function ensureDemo(locale: Locale): Promise<void> {
  if (!isDemo()) return;
  if ((await db().classes.count()) > 0) return;
  await importTables(demoTables(locale));
}

export async function resetDemo(): Promise<void> {
  if (!isDemo()) return;
  await wipeAll();
  await importTables(demoTables(readStoredLocale() ?? "en"));
}
