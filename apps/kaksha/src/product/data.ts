"use client";
// Live queries: screens re-render when the data they read changes.
import { useLiveQuery } from "dexie-react-hooks";
import { collator, type Locale } from "../i18n";
import { db } from "../lib/db";
import type {
  Answer,
  Assessment,
  ClassGroup,
  Id,
  Profile,
  School,
  Sitting,
  Student,
  StudentNote,
} from "../lib/model";
import { type ClassSummary, classSummary, percent } from "../lib/scoring";

export interface ClassInfo extends ClassGroup {
  school: School | undefined;
  studentCount: number;
  testCount: number;
}

export function useClasses(): ClassInfo[] | undefined {
  return useLiveQuery(async () => {
    const d = db();
    const [classes, schools] = await Promise.all([d.classes.toArray(), d.schools.toArray()]);
    return Promise.all(
      classes.map(async (c) => ({
        ...c,
        school: schools.find((s) => s.id === c.schoolId),
        studentCount: await d.students
          .where("classId")
          .equals(c.id)
          .filter((s) => s.active)
          .count(),
        testCount: await d.assessments.where("classId").equals(c.id).count(),
      })),
    );
  }, []);
}

export function useSchools(): School[] | undefined {
  return useLiveQuery(() => db().schools.toArray(), []);
}

export function useClass(
  id: Id,
): { cls: ClassGroup; school: School | undefined } | null | undefined {
  return useLiveQuery(async () => {
    const cls = await db().classes.get(id);
    if (!cls) return null;
    return { cls, school: await db().schools.get(cls.schoolId) };
  }, [id]);
}

export function sortStudents(students: Student[], locale: Locale): Student[] {
  const c = collator(locale);
  return [...students].sort((a, b) => c.compare(a.roll, b.roll) || c.compare(a.name, b.name));
}

export function useStudents(classId: Id | undefined, locale: Locale): Student[] | undefined {
  return useLiveQuery(
    async () =>
      classId
        ? sortStudents(await db().students.where("classId").equals(classId).toArray(), locale)
        : [],
    [classId, locale],
  );
}

export function useAssessments(classId: Id | undefined): Assessment[] | undefined {
  return useLiveQuery(async () => {
    if (!classId) return [];
    const all = await db().assessments.where("classId").equals(classId).toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [classId]);
}

export function useAssessment(id: Id): Assessment | null | undefined {
  return useLiveQuery(async () => (await db().assessments.get(id)) ?? null, [id]);
}

export function useAnswers(assessmentId: Id | undefined): Answer[] | undefined {
  return useLiveQuery(
    () => (assessmentId ? db().responses.where("assessmentId").equals(assessmentId).toArray() : []),
    [assessmentId],
  );
}

export function useSittings(assessmentId: Id | undefined): Sitting[] | undefined {
  return useLiveQuery(
    () => (assessmentId ? db().sittings.where("assessmentId").equals(assessmentId).toArray() : []),
    [assessmentId],
  );
}

/** All answers and sittings for a class's assessments, for progress over time. */
export function useClassRecords(classId: Id | undefined) {
  return useLiveQuery(async () => {
    if (!classId) return { answers: [] as Answer[], sittings: [] as Sitting[] };
    const ids = await db().assessments.where("classId").equals(classId).primaryKeys();
    const [answers, sittings] = await Promise.all([
      db().responses.where("assessmentId").anyOf(ids).toArray(),
      db().sittings.where("assessmentId").anyOf(ids).toArray(),
    ]);
    return { answers, sittings };
  }, [classId]);
}

export function classLabel(
  t: (k: "class.label", v: Record<string, string>) => string,
  c: ClassGroup,
): string {
  return t("class.label", { grade: c.grade, section: c.section });
}

/** A stored setting, live. `undefined` while loading, `null` when never set. */
export function useSetting<T>(key: string): T | null | undefined {
  return useLiveQuery(async () => {
    const row = await db().settings.get(key);
    return row ? (row.value as T) : null;
  }, [key]);
}

export function useProfile(): Profile | null | undefined {
  return useSetting<Profile>("profile");
}

export function useNotes(studentId: Id | undefined): StudentNote[] | undefined {
  return useLiveQuery(async () => {
    if (!studentId) return [];
    const all = await db().notes.where("studentId").equals(studentId).toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
  }, [studentId]);
}

export interface TestState {
  a: Assessment;
  summary: ClassSummary;
  /** Children marked (complete) or absent. */
  done: number;
  total: number;
  /** Class average as a percentage, from complete children only. */
  average: number | null;
  /** Most recent tap, for "continue where you stopped". */
  lastAt: number;
}

export interface ClassOverview {
  cls: ClassGroup;
  school: School | undefined;
  students: Student[];
  tests: TestState[];
}

/** Every class with every test summarised. Small data, so one pass is fine. */
export function useOverview(locale: Locale): ClassOverview[] | undefined {
  return useLiveQuery(async () => {
    const d = db();
    const [classes, schools, students, tests, answers, sittings] = await Promise.all([
      d.classes.toArray(),
      d.schools.toArray(),
      d.students.toArray(),
      d.assessments.toArray(),
      d.responses.toArray(),
      d.sittings.toArray(),
    ]);
    const ansBy = new Map<string, Answer[]>();
    for (const r of answers) {
      const list = ansBy.get(r.assessmentId) ?? [];
      list.push(r);
      ansBy.set(r.assessmentId, list);
    }
    return classes.map((cls) => {
      const kids = sortStudents(
        students.filter((s) => s.classId === cls.id),
        locale,
      );
      const states = tests
        .filter((a) => a.classId === cls.id)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .map((a) => {
          const rows = ansBy.get(a.id) ?? [];
          const summary = classSummary(
            a,
            kids,
            rows,
            sittings.filter((x) => x.assessmentId === a.id),
          );
          const done = summary.results.filter(
            (r) => r.status === "complete" || r.status === "absent",
          ).length;
          return {
            a,
            summary,
            done,
            total: summary.results.length,
            average:
              summary.meanScore === null
                ? null
                : percent(Math.round(summary.meanScore * 1000), summary.max * 1000),
            lastAt: rows.reduce((m, r) => Math.max(m, r.at), 0),
          };
        });
      return {
        cls,
        school: schools.find((s) => s.id === cls.schoolId),
        students: kids,
        tests: states,
      };
    });
  }, [locale]);
}
