import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { db, exportTables, importTables, previewImport, wipeAll } from "./db";
import { demoTables } from "./demo";

describe("merging backups", { timeout: 60_000 }, () => {
  it("previews what a restore will change, class by class, without changing anything", async () => {
    await wipeAll();
    const tables = demoTables("en", 1_000);
    const fresh = await previewImport(tables);
    expect(fresh.map((c) => c.state)).toEqual(["added", "added"]);
    expect(await db().classes.count()).toBe(0);

    await importTables(tables);
    const same = await previewImport(tables);
    expect(same.every((c) => c.state === "same")).toBe(true);

    // A newer tap for one answer in 4 B shows as one change there and none in 5 A.
    const first = tables.responses.find((r) => r.assessmentId === "demo-maths-aug");
    if (!first) throw new Error("demo data changed");
    const newer = {
      ...tables,
      responses: [{ ...first, value: first.value === "A" ? "B" : "A", at: first.at + 1 }],
    };
    const changed = await previewImport(newer);
    expect(changed.find((c) => c.classId === "demo-class-4b")).toMatchObject({
      state: "updated",
      changes: 1,
    });
    expect(changed.find((c) => c.classId === "demo-class-5a")?.state).toBe("same");
  });

  it("carries teachers' notes in backups, and keeps the newer copy of a note", async () => {
    await wipeAll();
    const tables = demoTables("en", 1_000);
    await importTables(tables);
    const out = await exportTables();
    expect(out.notes?.length).toBe(tables.notes?.length);
    const note = out.notes?.[0];
    if (!note) throw new Error("no notes in demo data");
    await importTables({ ...out, notes: [{ ...note, text: "older", at: note.at - 10 }] });
    expect((await db().notes.get(note.id))?.text).toBe(note.text);
    await importTables({ ...out, notes: [{ ...note, text: "newer", at: note.at + 10 }] });
    expect((await db().notes.get(note.id))?.text).toBe("newer");
  });

  it("restores a backup made before notes existed", async () => {
    await wipeAll();
    const { notes: _gone, ...old } = demoTables("en", 1_000);
    const r = await importTables(old);
    expect(r.added).toBeGreaterThan(0);
    expect(await db().notes.count()).toBe(0);
  });
});
