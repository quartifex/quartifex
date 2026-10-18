"use client";
import { useMemo, useState } from "react";
import { collator, formatDate, formatPercent, formatShortMonth } from "../../i18n";
import type { Assessment, Student } from "../../lib/model";
import { attendanceRate, classSummary, percent } from "../../lib/scoring";
import { Bars, Trend } from "../charts";
import { useApp } from "../context";
import { useAssessments, useClass, useClassRecords, useStudents } from "../data";
import { Empty, Icon, Pill, TopBar } from "../ui";

const TABS = ["tests", "students", "progress"] as const;
type Tab = (typeof TABS)[number];
type Summary = ReturnType<typeof classSummary>;

export default function ClassScreen({ classId, tab }: { classId: string; tab: string }) {
  const { t, go, locale } = useApp();
  const info = useClass(classId);
  const students = useStudents(classId, locale);
  const tests = useAssessments(classId);
  const records = useClassRecords(classId);
  const current: Tab = (TABS as readonly string[]).includes(tab) ? (tab as Tab) : "tests";

  const summaries = useMemo(() => {
    if (!tests || !students || !records) return new Map<string, Summary>();
    return new Map(
      tests.map((a) => [
        a.id,
        classSummary(
          a,
          students,
          records.answers.filter((r) => r.assessmentId === a.id),
          records.sittings.filter((s) => s.assessmentId === a.id),
        ),
      ]),
    );
  }, [tests, students, records]);

  if (info === null) {
    return (
      <>
        <TopBar back="/classes" />
        <main className="k-main">
          <Empty title={t("common.notFound")} />
        </main>
      </>
    );
  }
  if (!info) return null;
  const label = t("class.label", { grade: info.cls.grade, section: info.cls.section });
  const active = students?.filter((s) => s.active) ?? [];

  return (
    <>
      <TopBar
        title={label}
        sub={`${info.school?.name ?? ""} · ${info.cls.year}`}
        back="/classes"
        actions={
          <button
            type="button"
            className="icon-btn"
            onClick={() => go(`/class/${classId}/reports`)}
            aria-label={t("reports.title")}
          >
            <Icon name="print" />
          </button>
        }
      />
      <div className="tabs tabs--sticky" role="tablist" aria-label={label}>
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`tab-${k}`}
            aria-selected={current === k}
            aria-controls={`panel-${k}`}
            onClick={() => go(`/class/${classId}/${k}`, true)}
          >
            {t(`class.tab.${k}`)}
          </button>
        ))}
      </div>
      <main className="k-main">
        <section
          role="tabpanel"
          id={`panel-${current}`}
          aria-labelledby={`tab-${current}`}
          className="stack"
        >
          {current === "tests" ? (
            <TestsTab
              classId={classId}
              tests={tests}
              summaries={summaries}
              hasStudents={active.length > 0}
            />
          ) : null}
          {current === "students" ? (
            <StudentsTab
              classId={classId}
              students={active}
              tests={tests ?? []}
              summaries={summaries}
            />
          ) : null}
          {current === "progress" ? (
            <ProgressTab
              tests={tests ?? []}
              summaries={summaries}
              subjects={info.cls.subjects ?? []}
            />
          ) : null}
        </section>
      </main>
    </>
  );
}

function TestsTab({
  classId,
  tests,
  summaries,
  hasStudents,
}: {
  classId: string;
  tests: Assessment[] | undefined;
  summaries: Map<string, Summary>;
  hasStudents: boolean;
}) {
  const { t, go } = useApp();
  if (!hasStudents) {
    return (
      <Empty title={t("class.noStudents")} body={t("class.noStudentsBody")}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => go(`/class/${classId}/roster`)}
        >
          {t("class.addStudents")}
        </button>
      </Empty>
    );
  }
  return (
    <>
      {tests && tests.length === 0 ? (
        <Empty title={t("class.noTests")} body={t("class.noTestsBody")} />
      ) : null}
      <ul className="list list--gap">
        {(tests ?? []).map((a) => {
          const s = summaries.get(a.id);
          const done = s
            ? s.results.filter((r) => r.status === "complete" || r.status === "absent").length
            : 0;
          const total = s?.results.length ?? 0;
          const finished = total > 0 && done === total;
          return (
            <li key={a.id} className="card tcard">
              <div className="spread" style={{ alignItems: "flex-start" }}>
                <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                  <strong style={{ overflowWrap: "anywhere" }}>{a.title}</strong>
                  <span className="small muted">
                    {a.subject} · <span className="num">{formatDate(a.date)}</span> ·{" "}
                    {a.kind === "key"
                      ? t("test.kind.key", { n: a.items.length })
                      : t("test.kind.rubric", { n: a.items.length })}
                  </span>
                </div>
                {s ? (
                  <Pill tone={finished ? "right" : "genda"}>
                    {finished ? t("test.finished") : t("test.progress", { done, total })}
                  </Pill>
                ) : null}
              </div>
              <div className="cluster">
                {!finished ? (
                  <button
                    type="button"
                    className="btn btn--sm btn--primary"
                    onClick={() => go(`/test/${a.id}/mark`)}
                  >
                    {done > 0 ? t("test.continue") : t("test.mark")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => go(`/test/${a.id}`)}
                  disabled={!s || s.complete.length === 0}
                >
                  <Icon name="chart" />
                  {t("test.results")}
                </button>
                {finished ? (
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => go(`/test/${a.id}/mark`)}
                  >
                    {t("test.edit")}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className="fab" onClick={() => go(`/class/${classId}/new`)}>
        <Icon name="plus" />
        {t("class.newTest")}
      </button>
    </>
  );
}

type Filter = "all" | "help" | "absent";

function StudentsTab({
  classId,
  students,
  tests,
  summaries,
}: {
  classId: string;
  students: Student[];
  tests: Assessment[];
  summaries: Map<string, Summary>;
}) {
  const { t, go, locale } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Latest finished result and absences for each child, newest test first.
  const info = useMemo(() => {
    const out = new Map<string, { latest: number | null; absent: number; weak: string | null }>();
    for (const s of students) {
      let latest: number | null = null;
      let weak: string | null = null;
      let absent = 0;
      for (const a of tests) {
        const r = summaries.get(a.id)?.results.find((x) => x.studentId === s.id);
        if (!r) continue;
        if (r.status === "absent") absent += 1;
        if (latest === null && r.status === "complete") {
          latest = percent(r.score, r.max);
          const low = r.byDomain
            .map((d) => ({ d: d.domain, p: percent(d.score, d.max) ?? 100 }))
            .filter((x) => x.d && x.p < 50)
            .sort((x, y) => x.p - y.p)[0];
          weak = low?.d ?? null;
        }
      }
      out.set(s.id, { latest, absent, weak });
    }
    return out;
  }, [students, tests, summaries]);

  if (students.length === 0) {
    return (
      <Empty title={t("class.noStudents")} body={t("class.noStudentsBody")}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => go(`/class/${classId}/roster`)}
        >
          {t("class.addStudents")}
        </button>
      </Empty>
    );
  }

  const coll = collator(locale);
  const needle = q.trim().toLocaleLowerCase();
  const help = students.filter((s) => (info.get(s.id)?.latest ?? 100) < 50);
  const often = students.filter((s) => (info.get(s.id)?.absent ?? 0) >= 2);
  const shown = (filter === "help" ? help : filter === "absent" ? often : students).filter(
    (s) => !needle || s.name.toLocaleLowerCase().includes(needle) || s.roll === needle,
  );

  return (
    <>
      <label className="search">
        <Icon name="search" />
        <span className="sr-only">{t("class.search", { n: students.length })}</span>
        <input
          type="search"
          placeholder={t("class.search", { n: students.length })}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <fieldset className="cluster">
        <legend className="sr-only">{t("class.filter")}</legend>
        {(
          [
            ["all", t("class.filterAll", { n: students.length })],
            ["help", t("class.filterHelp", { n: help.length })],
            ["absent", t("class.filterAbsent", { n: often.length })],
          ] as Array<[Filter, string]>
        ).map(([k, text]) => (
          <button
            key={k}
            type="button"
            className="ochip"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
          >
            {text}
          </button>
        ))}
      </fieldset>
      <ul className="list card card--flush">
        {[...shown]
          .sort((a, b) => coll.compare(a.roll, b.roll))
          .map((s) => {
            const x = info.get(s.id);
            const meta =
              x?.latest === null || x === undefined
                ? x && x.absent > 0
                  ? t("class.absentFor", { n: x.absent })
                  : t("status.none")
                : x.weak
                  ? t("class.needsHelp", { skill: x.weak })
                  : x.latest >= 75
                    ? t("class.doingWell")
                    : t("class.steady");
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className="row-link row-link--flat"
                  onClick={() => go(`/student/${s.id}`)}
                >
                  <span className="roll-dot num">{s.roll.padStart(2, "0")}</span>
                  <span className="row-link__body">
                    <span className="row-link__title">{s.name}</span>
                    <span className="row-link__meta">{meta}</span>
                  </span>
                  <span
                    className="num row-link__value"
                    data-low={x?.latest !== null && (x?.latest ?? 100) < 50}
                  >
                    {formatPercent(locale, x?.latest ?? null)}
                  </span>
                  <span className="chev">
                    <Icon name="chev" />
                  </span>
                </button>
              </li>
            );
          })}
      </ul>
      {shown.length === 0 ? <p className="muted">{t("class.noMatch")}</p> : null}
      <div className="grid2 sticky-actions">
        <button type="button" className="btn" onClick={() => go(`/class/${classId}/roster`)}>
          <Icon name="pencil" />
          {t("class.editRoster")}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => go(`/class/${classId}/reports`)}
        >
          <Icon name="print" />
          {t("class.reportCards")}
        </button>
      </div>
    </>
  );
}

function ProgressTab({
  tests,
  summaries,
  subjects,
}: {
  tests: Assessment[];
  summaries: Map<string, Summary>;
  subjects: string[];
}) {
  const { t, go, locale } = useApp();
  const all = [...new Set([...subjects, ...tests.map((a) => a.subject)])].filter((s) =>
    tests.some((a) => a.subject === s),
  );
  const [subject, setSubject] = useState<string | null>(null);
  const chosen = subject ?? all[0] ?? null;
  const ordered = tests
    .filter((a) => chosen === null || a.subject === chosen)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  if (!tests.length) return <Empty title={t("class.noTests")} body={t("class.noTestsBody")} />;
  const points = ordered.map((a) => {
    const s = summaries.get(a.id);
    return {
      key: a.id,
      label: formatShortMonth(locale, a.date),
      value:
        s && s.meanScore !== null ? percent(Math.round(s.meanScore * 1000), s.max * 1000) : null,
    };
  });
  const known = points.filter((p) => p.value !== null);
  const firstP = known[0];
  const lastP = known[known.length - 1];
  const att = ordered
    .map((a) => summaries.get(a.id)?.attendance)
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .reduce(
      (acc, x) => ({ present: acc.present + x.present, absent: acc.absent + x.absent, unknown: 0 }),
      {
        present: 0,
        absent: 0,
        unknown: 0,
      },
    );
  const skills = new Map<string, { score: number; max: number }>();
  for (const a of ordered)
    for (const d of summaries.get(a.id)?.domains ?? []) {
      const acc = skills.get(d.domain) ?? { score: 0, max: 0 };
      acc.score += d.score;
      acc.max += d.max;
      skills.set(d.domain, acc);
    }

  return (
    <>
      {all.length > 1 ? (
        <fieldset className="cluster">
          <legend className="sr-only">{t("student.subject")}</legend>
          {all.map((s) => (
            <button
              key={s}
              type="button"
              className="ochip"
              aria-pressed={s === chosen}
              onClick={() => setSubject(s)}
            >
              {s}
            </button>
          ))}
        </fieldset>
      ) : null}
      <div className="card">
        <h2>{t("progress.average")}</h2>
        <Trend data={points} title={t("progress.averageChart")} />
        <div className="trend-labels num" aria-hidden="true">
          {points.map((p) => (
            <span key={p.key}>{p.label}</span>
          ))}
        </div>
        {firstP && lastP && firstP !== lastP ? (
          <p className="small muted">
            {t("progress.change", {
              now: formatPercent(locale, lastP.value),
              before: formatPercent(locale, firstP.value),
              month: firstP.label,
              att: formatPercent(locale, attendanceRate(att)),
            })}
          </p>
        ) : null}
      </div>
      {skills.size ? (
        <div className="card">
          <h2>{t("insights.skills")}</h2>
          <Bars
            caption={t("insights.skills")}
            data={[...skills.entries()]
              .map(([k, v]) => ({ k, p: percent(v.score, v.max) }))
              .sort((a, b) => (b.p ?? 0) - (a.p ?? 0))
              .map(({ k, p }) => ({
                key: k,
                label: k || t("entry.noDomain"),
                value: p,
                text: formatPercent(locale, p),
              }))}
          />
        </div>
      ) : null}
      <div className="card card--flush">
        <table className="mgrid" style={{ width: "100%" }}>
          <caption className="sr-only">{t("progress.table")}</caption>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: "left", padding: "8px 12px" }}>
                {t("progress.test")}
              </th>
              <th scope="col">{t("progress.avg")}</th>
              <th scope="col">{t("progress.attendance")}</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((a, i) => {
              const s = summaries.get(a.id);
              return (
                <tr key={a.id}>
                  <th scope="row" style={{ position: "static" }}>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{ padding: 0, textAlign: "left" }}
                      onClick={() => go(`/test/${a.id}`)}
                    >
                      {a.title}
                    </button>
                    <div className="small muted num">{formatDate(a.date)}</div>
                  </th>
                  <td className="num">{formatPercent(locale, points[i]?.value ?? null)}</td>
                  <td className="num">
                    {s ? formatPercent(locale, attendanceRate(s.attendance)) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
