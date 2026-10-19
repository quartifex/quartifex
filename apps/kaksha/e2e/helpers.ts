import type { Page } from "@playwright/test";

/**
 * Writes a class straight into the app's IndexedDB (database "kaksha"), for tests that
 * measure speed rather than the forms. Open /app once first so the schema exists.
 */
export async function seedClass(
  page: Page,
  opts: { students: number; items: number; answered?: boolean; testId?: string },
): Promise<{ classId: string; testId: string; studentIds: string[] }> {
  return page.evaluate(
    async ({ students, items, answered, testId }) => {
      const open = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open("kaksha");
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
      const db = await open();
      const put = (store: string, rows: unknown[]) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(store, "readwrite");
          const s = tx.objectStore(store);
          for (const row of rows) s.put(row);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      const classId = "perf-class";
      const id = testId ?? "perf-test";
      await put("schools", [{ id: "perf-school", name: "Test School (invented)" }]);
      await put("classes", [
        { id: classId, schoolId: "perf-school", grade: "5", section: "A", year: "2026-27" },
      ]);
      const studentIds = Array.from({ length: students }, (_, i) => `perf-s${i + 1}`);
      await put(
        "students",
        studentIds.map((sid, i) => ({
          id: sid,
          classId,
          roll: String(i + 1),
          name: `Student ${i + 1}`,
          active: true,
        })),
      );
      const keys = ["A", "B", "C", "D"];
      const itemRows = Array.from({ length: items }, (_, i) => ({
        id: `q${i + 1}`,
        label: `Q${i + 1}`,
        domain: ["Number", "Shapes", "Measure"][i % 3],
        type: "choice",
        key: keys[i % 4],
        marks: 1,
      }));
      await put("assessments", [
        {
          id,
          classId,
          title: "Speed test",
          subject: "Maths",
          date: "2026-10-01",
          createdAt: 1,
          kind: "key",
          items: itemRows,
        },
      ]);
      if (answered) {
        const rows = [];
        for (const sid of studentIds)
          for (const it of itemRows)
            rows.push({
              id: `${id}|${sid}|${it.id}`,
              assessmentId: id,
              studentId: sid,
              itemId: it.id,
              value: keys[(sid.length + it.id.length) % 4],
              at: 1,
            });
        await put("responses", rows);
      }
      db.close();
      return { classId, testId: id, studentIds };
    },
    {
      students: opts.students,
      items: opts.items,
      answered: opts.answered ?? false,
      testId: opts.testId,
    },
  );
}

/** Elements whose text is cut off: hidden overflow that is smaller than its content. */
export async function clippedText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      if (
        !el.textContent?.trim() ||
        el.closest(".sr-only, [aria-hidden='true'], script, style, svg")
      )
        continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const hidesX = cs.overflowX === "hidden" || cs.overflowX === "clip";
      const hidesY = cs.overflowY === "hidden" || cs.overflowY === "clip";
      // Line clamping and ellipsis are deliberate truncation, with the full text available elsewhere.
      if (cs.webkitLineClamp !== "none" && cs.webkitLineClamp !== "") continue;
      if (cs.textOverflow === "ellipsis") continue;
      if (
        (hidesX && el.scrollWidth > el.clientWidth + 1) ||
        (hidesY && el.scrollHeight > el.clientHeight + 1)
      ) {
        out.push(
          `${el.tagName.toLowerCase()}.${el.className}: "${el.textContent.trim().slice(0, 40)}"`,
        );
      }
    }
    if (document.documentElement.scrollWidth > window.innerWidth + 1)
      out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px)`);
    return out;
  });
}

export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}
