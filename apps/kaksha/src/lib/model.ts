// The data model. Everything here is stored on the teacher's device only.
//
// School -> Class (grade, section, year) -> Students
// Assessment (subject, date, kind) -> Items -> Responses
//
// Ids are random UUIDs, so backups from several phones can be merged without clashes.

export type Id = string;

export interface School {
  id: Id;
  name: string;
}

export interface ClassGroup {
  id: Id;
  schoolId: Id;
  grade: string;
  section: string;
  /** Academic year as the school writes it, for example "2026-27". */
  year: string;
  /** Subjects the teacher takes this class for. Optional; older data has none. */
  subjects?: string[];
}

export interface Student {
  id: Id;
  classId: Id;
  /** Roll number as written in the register. Sorted numerically when it is a number. */
  roll: string;
  name: string;
  /** Students who left the class stay in old results but drop out of new entry. */
  active: boolean;
}

export type Choice = "A" | "B" | "C" | "D";
export const CHOICES: readonly Choice[] = ["A", "B", "C", "D"];

/** A question in an answer-key test. */
export interface KeyItem {
  id: Id;
  /** What the teacher sees: "Q1", "1(a)" and so on. */
  label: string;
  /** Skill or domain tag, for example "Fractions". Empty string when untagged. */
  domain: string;
  /** "choice": the student picks A to D and `key` is the right one. "rightwrong": the teacher marks it. */
  type: "choice" | "rightwrong";
  key: Choice | null;
  /** Marks for a correct answer. Whole numbers, at least 1. */
  marks: number;
}

export interface RubricLevel {
  /** Points for this level. Levels are listed lowest first. */
  score: number;
  label: string;
  descriptor: string;
}

/** A criterion in a rubric. */
export interface RubricItem {
  id: Id;
  label: string;
  domain: string;
  levels: RubricLevel[];
}

interface AssessmentBase {
  id: Id;
  classId: Id;
  title: string;
  subject: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** The template it was made from, when there was one. */
  templateId?: string;
  createdAt: number;
}

export interface KeyAssessment extends AssessmentBase {
  kind: "key";
  items: KeyItem[];
}

export interface RubricAssessment extends AssessmentBase {
  kind: "rubric";
  items: RubricItem[];
}

export type Assessment = KeyAssessment | RubricAssessment;

/**
 * One tap. `value` is:
 * - a choice ("A" to "D") or "-" (the student left it blank) for choice items,
 * - "R" or "W" for right/wrong items, or "-",
 * - the level's score as a string for rubric criteria.
 * No response record at all means "not entered yet", which is different from "-".
 */
export interface Answer {
  /** `${assessmentId}|${studentId}|${itemId}` so each tap overwrites in place. */
  id: string;
  assessmentId: Id;
  studentId: Id;
  itemId: Id;
  value: string;
  at: number;
}

/** Attendance and a short note, one per student per assessment. */
export interface Sitting {
  /** `${assessmentId}|${studentId}` */
  id: string;
  assessmentId: Id;
  studentId: Id;
  absent: boolean;
  note: string;
}

/** A teacher's dated note about one child. Only on this phone. */
export interface StudentNote {
  id: Id;
  studentId: Id;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  text: string;
  /** Show this note on the report card. */
  onCard: boolean;
  at: number;
}

/** About the teacher, for greetings and report cards. Every field is optional. */
export interface Profile {
  name: string;
  board: string;
  medium: string;
}

export const BLANK = "-";

export const responseId = (assessmentId: Id, studentId: Id, itemId: Id) =>
  `${assessmentId}|${studentId}|${itemId}`;
export const sittingId = (assessmentId: Id, studentId: Id) => `${assessmentId}|${studentId}`;

export function newId(): Id {
  return crypto.randomUUID();
}
