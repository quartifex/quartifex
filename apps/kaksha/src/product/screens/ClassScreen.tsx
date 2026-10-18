"use client";
import { useMemo } from "react";
import { formatDate, formatPercent } from "../../i18n";
import type { Assessment } from "../../lib/model";
import { attendanceRate, classSummary, percent } from "../../lib/scoring";
import { Trend } from "../charts";
import { useApp } from "../context";
import { useAssessments, useClass, useClassRecords, useStudents } from "../data";
import { Empty, Icon, TopBar } from "../ui";

const TABS = ["tests", "students", "progress"] as const;
type Tab = (typeof TABS)[number];

export default function ClassScreen({ classId, tab }: { classId: string; tab: string }) {
  const { t, go, locale } = useApp();
  const info = useClass(classId);
  const students = useStudents(classId, locale);
  const tests = useAssessments(classId);
  const records = useClassRecords(classId);
  const current: Tab = (TABS as readonly string[]).includes(tab) ? (tab as Tab) : "tests";

  const summaries = useMemo(() => {
    if (!tests || !students || !records) return new Map<string, ReturnType<typeof classSummary>>();
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
        <TopBar back="/" />
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
        back="/"
        actions={
          <button
            type="button"
            className="icon-btn"
            onClick={() => go("/settings")}
            aria-label={t("nav.settings")}
          >
            <Icon name="settings" />
          </button>
        }
      />
      <main className="k-main">
        <div className="tabs" role="tablist" aria-label={label}>
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
            <>
              <div className="spread">
                <p className="muted">{t("class.studentCount", { n: active.length })}</p>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => go(`/class/${classId}/roster`)}
                >
                  <Icon name="pencil" />
                  {t("class.editRoster")}
                </button>
              </div>
              {active.length === 0 ? (
                <Empty title={t("class.noStudents")} body={t("class.noStudentsBody")}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => go(`/class/${classId}/roster`)}
                  >
                    {t("class.addStudents")}
                  </button>
                </Empty>
              ) : (
                <ul className="list">
                  {active.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="row-link"
                        style={{ minHeight: 56 }}
                        onClick={() => go(`/student/${s.id}`)}
                      >
                        <span className="num" style={{ minWidth: 36 }}>
                          {s.roll}
                        </span>
                        <span className="row-link__body">
                          <span className="row-link__title">{s.name}</span>
                        </span>
                        <span className="chev">
                          <Icon name="chev" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
          {current === "progress" ? (
            <ProgressTab tests={tests ?? []} summaries={summaries} />
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
  summaries: Map<string, ReturnType<typeof classSummary>>;
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
      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={() => go(`/class/${classId}/new`)}
      >
        <Icon name="plus" />
        {t("class.newTest")}
      </button>
      {tests && tests.length === 0 ? (
        <Empty title={t("class.noTests")} body={t("class.noTestsBody")} />
      ) : null}
      <ul className="list">
        {(tests ?? []).map((a) => {
          const s = summaries.get(a.id);
          const done = s
            ? s.results.filter((r) => r.status === "complete" || r.status === "absent").length
            : 0;
          const total = s?.results.length ?? 0;
          const finished = total > 0 && done === total;
          return (
            <li key={a.id} className="card" style={{ padding: 14, gap: 10 }}>
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
                  <span className={`chip${finished ? "" : " chip--genda"}`}>
                    {finished ? t("test.finished") : t("test.progress", { done, total })}
                  </span>
                ) : null}
              </div>
              <div className="cluster">
                <button
                  type="button"
                  className={`btn btn--sm${finished ? "" : " btn--primary"}`}
                  onClick={() => go(`/test/${a.id}/mark`)}
                >
                  {finished ? t("test.edit") : done > 0 ? t("test.continue") : t("test.mark")}
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => go(`/test/${a.id}`)}
                  disabled={!s || s.complete.length === 0}
                >
                  <Icon name="chart" />
                  {t("test.results")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ProgressTab({
  tests,
  summaries,
}: {
  tests: Assessment[];
  summaries: Map<string, ReturnType<typeof classSummary>>;
}) {
  const { t, go, locale } = useApp();
  const ordered = [...tests].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt,
  );
  if (!ordered.length) return <Empty title={t("class.noTests")} body={t("class.noTestsBody")} />;
  const points = ordered.map((a) => {
    const s = summaries.get(a.id);
    return {
      key: a.id,
      label: a.title,
      value:
        s && s.meanScore !== null ? percent(Math.round(s.meanScore * 1000), s.max * 1000) : null,
    };
  });
  return (
    <>
      <div className="card">
        <h2>{t("progress.average")}</h2>
        <Trend data={points} title={t("progress.averageChart")} />
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
