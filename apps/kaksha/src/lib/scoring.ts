// Scoring. These numbers go on report cards, so every rule is spelled out here and
// tested in scoring.test.ts. Nothing in this file touches storage or the DOM.
//
// Rules:
// - A response that was never entered is "not entered", not zero.
// - "-" means the student left it blank: zero points, but entered.
// - An absent student is left out of every class statistic (averages, mastery,
//   quartiles), never counted as zero.
// - Class statistics use "complete" students only: present, with every item entered.
//   The class view says how many students that is.
// - Quartile groups rank complete students by score; equal scores always share a group.
// - Percentages are rounded half up to one decimal place, from whole-number marks.

import type { Answer, Assessment, Id, KeyItem, RubricItem, Sitting, Student } from "./model";
import { BLANK } from "./model";

export type Item = KeyItem | RubricItem;

export function isRubricItem(item: Item): item is RubricItem {
  return "levels" in item;
}

/** The most points an item can give. */
export function itemMax(item: Item): number {
  if (isRubricItem(item)) return item.levels.reduce((max, level) => Math.max(max, level.score), 0);
  return item.marks;
}

/**
 * Points for one response, or null when nothing has been entered.
 * A value that does not fit the item (a stale level, a typo in an import) scores zero.
 */
export function itemPoints(item: Item, value: string | undefined): number | null {
  if (value === undefined) return null;
  if (value === BLANK) return 0;
  if (isRubricItem(item)) {
    const level = item.levels.find((l) => String(l.score) === value);
    return level ? level.score : 0;
  }
  if (item.type === "rightwrong") return value === "R" ? item.marks : 0;
  return item.key !== null && value === item.key ? item.marks : 0;
}

export function assessmentMax(assessment: Assessment): number {
  return (assessment.items as Item[]).reduce((sum, item) => sum + itemMax(item), 0);
}

/** Percentage rounded half up to one decimal. Returns null when there is nothing to divide by. */
export function percent(score: number, max: number): number | null {
  if (max <= 0) return null;
  // Work in tenths of a percent with integers to keep 2/3 -> 66.7 and 1/8 -> 12.5 exact.
  const tenths = Math.floor((score * 1000 * 2 + max) / (2 * max));
  return tenths / 10;
}

export const UNTAGGED = "";

export interface DomainScore {
  domain: string;
  score: number;
  max: number;
}

export type ResultStatus = "absent" | "complete" | "partial" | "none";

export interface StudentResult {
  studentId: Id;
  status: ResultStatus;
  /** Points from entered items. */
  score: number;
  /** Points available across the whole assessment. */
  max: number;
  entered: number;
  items: number;
  byDomain: DomainScore[];
  note: string;
}

/** Index responses by student, then item, for quick lookup. */
export function indexResponses(responses: readonly Answer[]): Map<Id, Map<Id, string>> {
  const byStudent = new Map<Id, Map<Id, string>>();
  for (const r of responses) {
    let row = byStudent.get(r.studentId);
    if (!row) {
      row = new Map();
      byStudent.set(r.studentId, row);
    }
    row.set(r.itemId, r.value);
  }
  return byStudent;
}

export function studentResult(
  assessment: Assessment,
  studentId: Id,
  row: ReadonlyMap<Id, string> | undefined,
  sitting: Sitting | undefined,
): StudentResult {
  const items = assessment.items as Item[];
  const domains = new Map<string, DomainScore>();
  let score = 0;
  let max = 0;
  let entered = 0;
  for (const item of items) {
    const m = itemMax(item);
    max += m;
    const d = domains.get(item.domain) ?? { domain: item.domain, score: 0, max: 0 };
    d.max += m;
    const points = itemPoints(item, row?.get(item.id));
    if (points !== null) {
      entered += 1;
      score += points;
      d.score += points;
    }
    domains.set(item.domain, d);
  }
  let status: ResultStatus;
  if (sitting?.absent) status = "absent";
  else if (entered === items.length && items.length > 0) status = "complete";
  else if (entered > 0) status = "partial";
  else status = "none";
  return {
    studentId,
    status,
    score: status === "absent" ? 0 : score,
    max,
    entered: status === "absent" ? 0 : entered,
    items: items.length,
    byDomain: [...domains.values()],
    note: sitting?.note ?? "",
  };
}

/**
 * Quartile groups, 4 = top. Students are ranked by score (rank 0 is the lowest);
 * each is placed by the middle of the ranks its score shares, so equal scores always
 * land in the same group. With p = midRank / (n - 1), group = min(4, floor(4p) + 1):
 * the lowest score is always group 1 and the highest group 4. One student is group 1.
 * The app shows groups only from 4 complete students up.
 */
export function quartiles(
  entries: ReadonlyArray<{ id: Id; score: number }>,
): Map<Id, 1 | 2 | 3 | 4> {
  const n = entries.length;
  const out = new Map<Id, 1 | 2 | 3 | 4>();
  if (n === 0) return out;
  const scores = entries.map((e) => e.score).sort((a, b) => a - b);
  for (const e of entries) {
    let below = 0;
    let equal = 0;
    for (const s of scores) {
      if (s < e.score) below += 1;
      else if (s === e.score) equal += 1;
    }
    const mid = below + (equal - 1) / 2;
    const p = n === 1 ? 0 : mid / (n - 1);
    const group = Math.min(4, Math.floor(4 * p) + 1) as 1 | 2 | 3 | 4;
    out.set(e.id, group);
  }
  return out;
}

export interface ItemStat {
  itemId: Id;
  /** Points scored by complete students on this item. */
  score: number;
  /** Points available to complete students on this item. */
  max: number;
  /** How many complete students chose each value (A to D, R, W, a level, or "-"). */
  counts: Record<string, number>;
}

export interface Attendance {
  present: number;
  absent: number;
  /** Students with no attendance and no responses yet. */
  unknown: number;
}

export interface ClassSummary {
  results: StudentResult[];
  complete: StudentResult[];
  attendance: Attendance;
  /** Mean score of complete students, and the points available. */
  meanScore: number | null;
  max: number;
  items: ItemStat[];
  domains: DomainScore[];
  quartile: Map<Id, 1 | 2 | 3 | 4>;
  /** Per domain, complete students below the threshold, lowest first. */
  needsHelp: Array<{ domain: string; students: Array<{ studentId: Id; percent: number }> }>;
}

export function classSummary(
  assessment: Assessment,
  students: readonly Student[],
  responses: readonly Answer[],
  sittings: readonly Sitting[],
  helpThreshold = 50,
): ClassSummary {
  const rows = indexResponses(responses);
  const sittingBy = new Map(sittings.map((s) => [s.studentId, s]));
  // Inactive students only count where they already have something recorded.
  const included = students.filter(
    (s) => s.active || rows.has(s.id) || sittingBy.get(s.id)?.absent,
  );
  const results = included.map((s) =>
    studentResult(assessment, s.id, rows.get(s.id), sittingBy.get(s.id)),
  );
  const complete = results.filter((r) => r.status === "complete");
  const items = assessment.items as Item[];

  const attendance: Attendance = { present: 0, absent: 0, unknown: 0 };
  for (const r of results) {
    if (r.status === "absent") attendance.absent += 1;
    else if (r.status === "none" && !sittingBy.has(r.studentId)) attendance.unknown += 1;
    else attendance.present += 1;
  }

  const itemStats: ItemStat[] = items.map((item) => {
    const m = itemMax(item);
    const stat: ItemStat = { itemId: item.id, score: 0, max: 0, counts: {} };
    for (const r of complete) {
      const value = rows.get(r.studentId)?.get(item.id) ?? BLANK;
      stat.max += m;
      stat.score += itemPoints(item, value) ?? 0;
      stat.counts[value] = (stat.counts[value] ?? 0) + 1;
    }
    return stat;
  });

  const domainMap = new Map<string, DomainScore>();
  for (const r of complete) {
    for (const d of r.byDomain) {
      const acc = domainMap.get(d.domain) ?? { domain: d.domain, score: 0, max: 0 };
      acc.score += d.score;
      acc.max += d.max;
      domainMap.set(d.domain, acc);
    }
  }

  const needsHelp: ClassSummary["needsHelp"] = [];
  for (const domain of domainMap.keys()) {
    const below: Array<{ studentId: Id; percent: number }> = [];
    for (const r of complete) {
      const d = r.byDomain.find((x) => x.domain === domain);
      const p = d ? percent(d.score, d.max) : null;
      if (p !== null && p < helpThreshold) below.push({ studentId: r.studentId, percent: p });
    }
    below.sort((a, b) => a.percent - b.percent);
    if (below.length) needsHelp.push({ domain, students: below });
  }

  const total = complete.reduce((sum, r) => sum + r.score, 0);
  return {
    results,
    complete,
    attendance,
    meanScore: complete.length ? total / complete.length : null,
    max: assessmentMax(assessment),
    items: itemStats,
    domains: [...domainMap.values()],
    quartile: quartiles(complete.map((r) => ({ id: r.studentId, score: r.score }))),
    needsHelp,
  };
}

/** Attendance rate across sittings: present / (present + absent), as a percentage. */
export function attendanceRate(a: Attendance): number | null {
  return percent(a.present, a.present + a.absent);
}

export interface TrendPoint {
  assessmentId: Id;
  date: string;
  /** null when absent or not complete. */
  percent: number | null;
  status: ResultStatus;
}

/** One student across assessments, oldest first. */
export function studentTrend(
  assessments: readonly Assessment[],
  studentId: Id,
  responses: readonly Answer[],
  sittings: readonly Sitting[],
): TrendPoint[] {
  return [...assessments]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((a) => {
      const row = new Map<Id, string>();
      for (const r of responses) {
        if (r.assessmentId === a.id && r.studentId === studentId) row.set(r.itemId, r.value);
      }
      const sitting = sittings.find((s) => s.assessmentId === a.id && s.studentId === studentId);
      const res = studentResult(a, studentId, row, sitting);
      return {
        assessmentId: a.id,
        date: a.date,
        status: res.status,
        percent: res.status === "complete" ? percent(res.score, res.max) : null,
      };
    });
}

/** Strengths and gaps for one student, pooled across the given assessments by domain. */
export function studentDomains(
  assessments: readonly Assessment[],
  studentId: Id,
  responses: readonly Answer[],
  sittings: readonly Sitting[],
): DomainScore[] {
  const acc = new Map<string, DomainScore>();
  for (const a of assessments) {
    const row = new Map<Id, string>();
    for (const r of responses) {
      if (r.assessmentId === a.id && r.studentId === studentId) row.set(r.itemId, r.value);
    }
    const sitting = sittings.find((s) => s.assessmentId === a.id && s.studentId === studentId);
    const res = studentResult(a, studentId, row, sitting);
    if (res.status !== "complete") continue;
    for (const d of res.byDomain) {
      const x = acc.get(d.domain) ?? { domain: d.domain, score: 0, max: 0 };
      x.score += d.score;
      x.max += d.max;
      acc.set(d.domain, x);
    }
  }
  return [...acc.values()];
}
