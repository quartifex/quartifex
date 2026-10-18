import { describe, expect, it } from "vitest";
import type { Answer, KeyAssessment, RubricAssessment, Sitting, Student } from "./model";
import { responseId, sittingId } from "./model";
import {
  assessmentMax,
  attendanceRate,
  classSummary,
  itemPoints,
  percent,
  quartiles,
  studentDomains,
  studentResult,
  studentTrend,
} from "./scoring";

const key: KeyAssessment = {
  id: "t1",
  classId: "c1",
  title: "Unit test",
  subject: "Maths",
  date: "2026-07-01",
  createdAt: 1,
  kind: "key",
  items: [
    { id: "q1", label: "Q1", domain: "Number", type: "choice", key: "A", marks: 1 },
    { id: "q2", label: "Q2", domain: "Number", type: "choice", key: "C", marks: 2 },
    { id: "q3", label: "Q3", domain: "Shapes", type: "rightwrong", key: null, marks: 1 },
  ],
};

const rubric: RubricAssessment = {
  id: "r1",
  classId: "c1",
  title: "Writing",
  subject: "Language",
  date: "2026-07-02",
  createdAt: 2,
  kind: "rubric",
  items: [
    {
      id: "ideas",
      label: "Ideas",
      domain: "Content",
      levels: [1, 2, 3, 4].map((score) => ({ score, label: `L${score}`, descriptor: "" })),
    },
    {
      id: "spell",
      label: "Spelling",
      domain: "Conventions",
      levels: [0, 1, 2].map((score) => ({ score, label: `L${score}`, descriptor: "" })),
    },
  ],
};

const students: Student[] = ["s1", "s2", "s3", "s4", "s5"].map((id, i) => ({
  id,
  classId: "c1",
  roll: String(i + 1),
  name: `Student ${i + 1}`,
  active: true,
}));

function answers(
  assessmentId: string,
  studentId: string,
  values: Record<string, string>,
): Answer[] {
  return Object.entries(values).map(([itemId, value]) => ({
    id: responseId(assessmentId, studentId, itemId),
    assessmentId,
    studentId,
    itemId,
    value,
    at: 0,
  }));
}

const absent = (assessmentId: string, studentId: string): Sitting => ({
  id: sittingId(assessmentId, studentId),
  assessmentId,
  studentId,
  absent: true,
  note: "",
});

describe("percent", () => {
  it("rounds half up to one decimal from whole marks", () => {
    expect(percent(2, 3)).toBe(66.7);
    expect(percent(1, 3)).toBe(33.3);
    expect(percent(1, 8)).toBe(12.5);
    expect(percent(1, 16)).toBe(6.3); // 6.25 rounds half up
    expect(percent(0, 4)).toBe(0);
    expect(percent(4, 4)).toBe(100);
  });
  it("has no answer when nothing is available", () => {
    expect(percent(0, 0)).toBeNull();
  });
});

describe("answer-key scoring", () => {
  it("scores choices against the key, right/wrong by the mark, blanks as zero", () => {
    const [q1, q2, q3] = key.items;
    if (!q1 || !q2 || !q3) throw new Error("fixture");
    expect(itemPoints(q1, "A")).toBe(1);
    expect(itemPoints(q1, "B")).toBe(0);
    expect(itemPoints(q2, "C")).toBe(2);
    expect(itemPoints(q3, "R")).toBe(1);
    expect(itemPoints(q3, "W")).toBe(0);
    expect(itemPoints(q1, "-")).toBe(0);
    expect(itemPoints(q1, undefined)).toBeNull();
    expect(itemPoints(q1, "Z")).toBe(0);
  });

  it("totals marks, not questions", () => {
    expect(assessmentMax(key)).toBe(4);
    const row = new Map([
      ["q1", "A"],
      ["q2", "C"],
      ["q3", "W"],
    ]);
    const r = studentResult(key, "s1", row, undefined);
    expect(r).toMatchObject({ status: "complete", score: 3, max: 4, entered: 3, items: 3 });
    expect(r.byDomain).toEqual([
      { domain: "Number", score: 3, max: 3 },
      { domain: "Shapes", score: 0, max: 1 },
    ]);
  });

  it("tells partial, empty and absent apart", () => {
    expect(studentResult(key, "s1", new Map([["q1", "A"]]), undefined).status).toBe("partial");
    expect(studentResult(key, "s1", undefined, undefined).status).toBe("none");
    const gone = studentResult(key, "s1", new Map([["q1", "A"]]), absent("t1", "s1"));
    expect(gone).toMatchObject({ status: "absent", score: 0, entered: 0 });
  });
});

describe("rubric totals", () => {
  it("adds the chosen level of each criterion against the top levels", () => {
    expect(assessmentMax(rubric)).toBe(6);
    const r = studentResult(
      rubric,
      "s1",
      new Map([
        ["ideas", "3"],
        ["spell", "0"],
      ]),
      undefined,
    );
    expect(r).toMatchObject({ status: "complete", score: 3, max: 6 });
    expect(r.byDomain).toEqual([
      { domain: "Content", score: 3, max: 4 },
      { domain: "Conventions", score: 0, max: 2 },
    ]);
  });
  it("treats a level 0 as entered", () => {
    const r = studentResult(rubric, "s1", new Map([["spell", "0"]]), undefined);
    expect(r).toMatchObject({ status: "partial", entered: 1, score: 0 });
  });
});

describe("quartiles", () => {
  it("splits distinct scores evenly, 4 at the top", () => {
    const q = quartiles(
      [10, 20, 30, 40, 50, 60, 70, 80].map((score, i) => ({ id: `s${i}`, score })),
    );
    expect([...q.values()]).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("keeps equal scores in the same group", () => {
    const q = quartiles([
      { id: "a", score: 1 },
      { id: "b", score: 2 },
      { id: "c", score: 2 },
      { id: "d", score: 2 },
      { id: "e", score: 5 },
    ]);
    expect(q.get("b")).toBe(q.get("c"));
    expect(q.get("c")).toBe(q.get("d"));
    expect(q.get("a")).toBe(1);
    expect(q.get("e")).toBe(4);
    expect(q.get("b")).toBe(3); // mid rank 2 of 0..4 -> p 0.5 -> group 3
  });

  it("handles one student and everyone tied", () => {
    expect(quartiles([{ id: "a", score: 3 }]).get("a")).toBe(1);
    const tied = quartiles(["a", "b", "c", "d"].map((id) => ({ id, score: 7 })));
    expect(new Set(tied.values()).size).toBe(1);
    expect(tied.get("a")).toBe(3); // everyone shares the middle rank
  });

  it("is empty for no students", () => {
    expect(quartiles([]).size).toBe(0);
  });
});

describe("class summary", () => {
  const responses = [
    ...answers("t1", "s1", { q1: "A", q2: "C", q3: "R" }), // 4
    ...answers("t1", "s2", { q1: "A", q2: "B", q3: "R" }), // 2
    ...answers("t1", "s3", { q1: "-", q2: "C", q3: "W" }), // 2
    ...answers("t1", "s4", { q1: "A" }), // partial
  ];
  const sittings = [absent("t1", "s5")];
  const summary = classSummary(key, students, responses, sittings);

  it("uses complete students only, and never counts the absent as zero", () => {
    expect(summary.complete.map((r) => r.studentId)).toEqual(["s1", "s2", "s3"]);
    expect(summary.meanScore).toBeCloseTo(8 / 3, 10);
    expect(summary.max).toBe(4);
  });

  it("counts attendance from marks and entries", () => {
    expect(summary.attendance).toEqual({ present: 4, absent: 1, unknown: 0 });
    expect(attendanceRate(summary.attendance)).toBe(80);
  });

  it("gives question mastery and answer counts", () => {
    const [q1, q2] = summary.items;
    expect(q1).toMatchObject({ score: 2, max: 3, counts: { A: 2, "-": 1 } });
    expect(q2).toMatchObject({ score: 4, max: 6, counts: { C: 2, B: 1 } });
  });

  it("pools domain mastery across complete students", () => {
    expect(summary.domains).toEqual([
      { domain: "Number", score: 6, max: 9 },
      { domain: "Shapes", score: 2, max: 3 },
    ]);
  });

  it("lists who needs help per domain, lowest first", () => {
    const shapes = summary.needsHelp.find((n) => n.domain === "Shapes");
    expect(shapes?.students).toEqual([{ studentId: "s3", percent: 0 }]);
    const number = summary.needsHelp.find((n) => n.domain === "Number");
    expect(number?.students).toEqual([{ studentId: "s2", percent: 33.3 }]);
  });

  it("places tied scores together and leaves absent and partial students out", () => {
    expect(summary.quartile.get("s2")).toBe(summary.quartile.get("s3"));
    expect(summary.quartile.get("s1")).toBe(4);
    expect(summary.quartile.has("s4")).toBe(false);
    expect(summary.quartile.has("s5")).toBe(false);
  });

  it("counts students with nothing yet as unknown attendance", () => {
    const empty = classSummary(key, students, [], []);
    expect(empty.attendance).toEqual({ present: 0, absent: 0, unknown: 5 });
    expect(attendanceRate(empty.attendance)).toBeNull();
    expect(empty.meanScore).toBeNull();
  });

  it("keeps a student who left only where they have results", () => {
    const left = students.map((s) => (s.id === "s1" ? { ...s, active: false } : s));
    expect(classSummary(key, left, responses, sittings).results).toHaveLength(5);
    expect(classSummary(key, left, [], []).results).toHaveLength(4);
  });
});

describe("one student over time", () => {
  const second: KeyAssessment = { ...key, id: "t2", date: "2026-08-01", createdAt: 3 };
  const responses = [
    ...answers("t1", "s1", { q1: "A", q2: "B", q3: "R" }), // 2 of 4
    ...answers("t2", "s1", { q1: "A", q2: "C", q3: "R" }), // 4 of 4
  ];
  it("lists results oldest first with absences as gaps", () => {
    const third: KeyAssessment = { ...key, id: "t3", date: "2026-09-01", createdAt: 4 };
    const trend = studentTrend([second, third, key], "s1", responses, [absent("t3", "s1")]);
    expect(trend.map((p) => [p.assessmentId, p.percent, p.status])).toEqual([
      ["t1", 50, "complete"],
      ["t2", 100, "complete"],
      ["t3", null, "absent"],
    ]);
  });
  it("pools strengths and gaps by domain", () => {
    expect(studentDomains([key, second], "s1", responses, [])).toEqual([
      { domain: "Number", score: 4, max: 6 },
      { domain: "Shapes", score: 2, max: 2 },
    ]);
  });
});
