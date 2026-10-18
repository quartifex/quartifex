"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { formatDate, formatPercent } from "../../i18n";
import { db } from "../../lib/db";
import { percent, studentDomains, studentTrend } from "../../lib/scoring";
import { Bars, Trend } from "../charts";
import { useApp } from "../context";
import { useAssessments, useClassRecords } from "../data";
import { Empty, Icon, TopBar } from "../ui";

export function useStudentView(studentId: string) {
  const student = useLiveQuery(
    async () => (await db().students.get(studentId)) ?? null,
    [studentId],
  );
  const tests = useAssessments(student?.classId);
  const records = useClassRecords(student?.classId);
  return { student, tests, records };
}

export default function StudentScreen({ studentId }: { studentId: string }) {
  const { t, go, locale } = useApp();
  const { student, tests, records } = useStudentView(studentId);
  const subjects = useMemo(() => [...new Set((tests ?? []).map((a) => a.subject))], [tests]);
  const [subject, setSubject] = useState<string | null>(null);

  if (student === null) return <Empty title={t("common.notFound")} />;
  if (!student || !tests || !records)
    return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
  const chosen = subject ?? subjects[0] ?? null;
  const scope = chosen === null ? tests : tests.filter((a) => a.subject === chosen);
  const trend = studentTrend(scope, student.id, records.answers, records.sittings);
  const domains = studentDomains(scope, student.id, records.answers, records.sittings)
    .map((d) => ({ ...d, p: percent(d.score, d.max) }))
    .sort((x, y) => (y.p ?? 0) - (x.p ?? 0));
  const byId = new Map(tests.map((a) => [a.id, a]));

  return (
    <>
      <TopBar
        title={student.name}
        sub={t("student.roll", { roll: student.roll })}
        back={`/class/${student.classId}/students`}
        actions={
          <button
            type="button"
            className="icon-btn"
            onClick={() => go(`/student/${student.id}/report`)}
            aria-label={t("student.report")}
          >
            <Icon name="print" />
          </button>
        }
      />
      <main className="k-main">
        {subjects.length > 1 ? (
          <div className="tabs" role="tablist" aria-label={t("student.subject")}>
            {subjects.map((sub) => (
              <button
                key={sub}
                type="button"
                role="tab"
                aria-selected={sub === chosen}
                onClick={() => setSubject(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        ) : null}
        {trend.length === 0 ? (
          <Empty title={t("class.noTests")} />
        ) : (
          <>
            <section className="card" aria-labelledby="trend-h">
              <h2 id="trend-h">{t("student.overTime")}</h2>
              <Trend
                title={t("student.overTime")}
                data={trend.map((p) => ({
                  key: p.assessmentId,
                  label: byId.get(p.assessmentId)?.title ?? "",
                  value: p.percent,
                }))}
              />
              <ul className="list">
                {trend.map((p) => {
                  const a = byId.get(p.assessmentId);
                  return (
                    <li
                      key={p.assessmentId}
                      className="spread"
                      style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 8 }}
                    >
                      <span>
                        {a?.title} <span className="small muted num">{formatDate(p.date)}</span>
                      </span>
                      <span className="num">
                        {p.status === "complete"
                          ? formatPercent(locale, p.percent)
                          : t(`status.${p.status}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="card" aria-labelledby="dom-h">
              <h2 id="dom-h">{t("student.domains")}</h2>
              {domains.length === 0 ? (
                <p className="muted">{t("student.noComplete")}</p>
              ) : (
                <>
                  <Bars
                    caption={t("student.domains")}
                    data={domains.map((d) => ({
                      key: d.domain,
                      label: d.domain || t("entry.noDomain"),
                      value: d.p,
                      text: formatPercent(locale, d.p),
                    }))}
                  />
                  <p className="small muted">{t("student.domainsNote")}</p>
                </>
              )}
            </section>
          </>
        )}
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => go(`/student/${student.id}/report`)}
        >
          <Icon name="print" />
          {t("student.report")}
        </button>
      </main>
    </>
  );
}
