// Storage: IndexedDB through Dexie, on this device only. Every tap is written as it
// happens, so a crash or a closed tab loses nothing.
import Dexie, { type EntityTable } from "dexie";
import { DB_NAME, DEMO_DB_NAME } from "../config";
import type { BackupTables } from "./backup";
import type {
  Answer,
  Assessment,
  ClassGroup,
  Id,
  School,
  Sitting,
  Student,
  StudentNote,
} from "./model";
import { responseId, sittingId } from "./model";

export interface Setting {
  key: string;
  value: unknown;
}

export class KakshaDb extends Dexie {
  schools!: EntityTable<School, "id">;
  classes!: EntityTable<ClassGroup, "id">;
  students!: EntityTable<Student, "id">;
  assessments!: EntityTable<Assessment, "id">;
  responses!: EntityTable<Answer, "id">;
  sittings!: EntityTable<Sitting, "id">;
  settings!: EntityTable<Setting, "key">;
  notes!: EntityTable<StudentNote, "id">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      schools: "id",
      classes: "id, schoolId",
      students: "id, classId",
      assessments: "id, classId, date",
      responses: "id, assessmentId, studentId, [assessmentId+studentId]",
      sittings: "id, assessmentId, studentId",
      settings: "key",
    });
    this.version(2).stores({ notes: "id, studentId" });
  }
}

let instance: KakshaDb | null = null;

export function isDemo(): boolean {
  if (typeof location === "undefined") return false;
  return new URLSearchParams(location.search).get("demo") === "1";
}

export function db(): KakshaDb {
  if (!instance) instance = new KakshaDb(isDemo() ? DEMO_DB_NAME : DB_NAME);
  return instance;
}

/** Record one tap. Returns the previous value so the caller can undo it. */
export async function setAnswer(
  assessmentId: Id,
  studentId: Id,
  itemId: Id,
  value: string | undefined,
): Promise<string | undefined> {
  const d = db();
  const id = responseId(assessmentId, studentId, itemId);
  return d.transaction("rw", d.responses, d.sittings, async () => {
    const before = await d.responses.get(id);
    if (value === undefined) await d.responses.delete(id);
    else {
      await d.responses.put({ id, assessmentId, studentId, itemId, value, at: Date.now() });
      // Entering an answer means the student was there.
      const sid = sittingId(assessmentId, studentId);
      const sitting = await d.sittings.get(sid);
      if (sitting?.absent) await d.sittings.put({ ...sitting, absent: false });
    }
    return before?.value;
  });
}

export async function setAbsent(
  assessmentId: Id,
  studentId: Id,
  absent: boolean,
): Promise<boolean> {
  const d = db();
  const id = sittingId(assessmentId, studentId);
  const before = await d.sittings.get(id);
  await d.sittings.put({ id, assessmentId, studentId, absent, note: before?.note ?? "" });
  return before?.absent ?? false;
}

export async function setNote(assessmentId: Id, studentId: Id, note: string): Promise<void> {
  const d = db();
  const id = sittingId(assessmentId, studentId);
  const before = await d.sittings.get(id);
  await d.sittings.put({ id, assessmentId, studentId, absent: before?.absent ?? false, note });
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db().settings.get(key))?.value as T | undefined;
}

export async function putSetting(key: string, value: unknown): Promise<void> {
  await db().settings.put({ key, value });
}

export async function exportTables(): Promise<BackupTables> {
  const d = db();
  const [schools, classes, students, assessments, responses, sittings, notes] = await Promise.all([
    d.schools.toArray(),
    d.classes.toArray(),
    d.students.toArray(),
    d.assessments.toArray(),
    d.responses.toArray(),
    d.sittings.toArray(),
    d.notes.toArray(),
  ]);
  return { schools, classes, students, assessments, responses, sittings, notes };
}

export interface MergeCounts {
  added: number;
  updated: number;
}

/**
 * Restore or merge a backup. Records keep their ids, so restoring onto a phone that
 * already has the same class updates it in place, and a colleague's classes are added
 * beside yours. For answers, the most recent tap wins.
 */
export async function importTables(tables: BackupTables): Promise<MergeCounts> {
  const d = db();
  let added = 0;
  let updated = 0;
  await d.transaction(
    "rw",
    [d.schools, d.classes, d.students, d.assessments, d.responses, d.sittings, d.notes],
    async () => {
      const merge = async <T extends { id: string }>(
        table: EntityTable<T, "id">,
        rows: T[],
        newer?: (incoming: T, existing: T) => boolean,
      ) => {
        const existing = await table.bulkGet(rows.map((r) => r.id) as never);
        const put: T[] = [];
        rows.forEach((row, i) => {
          const have = existing[i];
          if (!have) {
            added += 1;
            put.push(row);
          } else if (!newer || newer(row, have)) {
            updated += 1;
            put.push(row);
          }
        });
        if (put.length) await table.bulkPut(put as never);
      };
      await merge(d.schools, tables.schools);
      await merge(d.classes, tables.classes);
      await merge(d.students, tables.students);
      await merge(d.assessments, tables.assessments);
      await merge(d.responses, tables.responses, (a, b) => a.at >= b.at);
      await merge(d.sittings, tables.sittings);
      await merge(d.notes, tables.notes ?? [], (a, b) => a.at >= b.at);
    },
  );
  return { added, updated };
}

export async function wipeAll(): Promise<void> {
  const d = db();
  await d.transaction("rw", d.tables, async () => {
    await Promise.all(d.tables.map((t) => t.clear()));
  });
}

export async function deleteAssessment(id: Id): Promise<void> {
  const d = db();
  await d.transaction("rw", d.assessments, d.responses, d.sittings, async () => {
    await d.responses.where("assessmentId").equals(id).delete();
    await d.sittings.where("assessmentId").equals(id).delete();
    await d.assessments.delete(id);
  });
}

export async function deleteClass(id: Id): Promise<void> {
  const d = db();
  const tests = await d.assessments.where("classId").equals(id).primaryKeys();
  for (const t of tests) await deleteAssessment(t);
  await d.transaction("rw", d.students, d.classes, d.schools, d.notes, async () => {
    const cls = await d.classes.get(id);
    const kids = await d.students.where("classId").equals(id).primaryKeys();
    await d.notes.where("studentId").anyOf(kids).delete();
    await d.students.where("classId").equals(id).delete();
    await d.classes.delete(id);
    if (cls) {
      const others = await d.classes.where("schoolId").equals(cls.schoolId).count();
      if (others === 0) await d.schools.delete(cls.schoolId);
    }
  });
}

export interface MergePreview {
  classId: Id;
  grade: string;
  section: string;
  state: "added" | "updated" | "same";
  /** Answers that would be added or replaced by newer taps. */
  changes: number;
  students: number;
}

/** What importTables would do, class by class, without changing anything. */
export async function previewImport(tables: BackupTables): Promise<MergePreview[]> {
  const d = db();
  const out: MergePreview[] = [];
  for (const c of tables.classes) {
    const have = await d.classes.get(c.id);
    const tests = new Set(tables.assessments.filter((a) => a.classId === c.id).map((a) => a.id));
    const rows = tables.responses.filter((r) => tests.has(r.assessmentId));
    const existing = await d.responses.bulkGet(rows.map((r) => r.id));
    const changes = rows.filter((r, i) => {
      const e = existing[i];
      return !e || (r.at > e.at && r.value !== e.value);
    }).length;
    out.push({
      classId: c.id,
      grade: c.grade,
      section: c.section,
      state: !have ? "added" : changes > 0 ? "updated" : "same",
      changes,
      students: tables.students.filter((s) => s.classId === c.id).length,
    });
  }
  return out;
}

export async function addNote(studentId: Id, text: string, onCard: boolean): Promise<void> {
  await db().notes.put({
    id: crypto.randomUUID(),
    studentId,
    date: new Date().toISOString().slice(0, 10),
    text,
    onCard,
    at: Date.now(),
  });
}
