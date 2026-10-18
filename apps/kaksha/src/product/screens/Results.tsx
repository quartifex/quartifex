"use client";
import { useMemo } from "react";
import { formatDate, formatNumber, formatPercent, type Key } from "../../i18n";
import { toCsv } from "../../lib/csv";
import type { Assessment, Student } from "../../lib/model";
import {
  attendanceRate,
  type ClassSummary,
  classSummary,
  indexResponses,
  percent,
} from "../../lib/scoring";
import { Bars } from "../charts";
import { useApp } from "../context";
import { useAnswers, useAssessment, useSittings, useStudents } from "../data";
import { saveText } from "../files";
import { Empty, Icon, Stat, TopBar } from "../ui";

export function useSummary(assessmentId: string) {
  const { locale } = useApp();
  const a = useAssessment(assessmentId);
  const students = useStudents(a?.classId, locale);
  const answers = useAnswers(a?.id);
  const sittings = useSittings(a?.id);
  const summary = useMemo(
    () =>
      a && students && answers && sittings ? classSummary(a, students, answers, sittings) : null,
    [a, students, answers, sittings],
  );
  return { a, students, answers, summary };
}

export function exportCsv(
  a: Assessment,
  students: Student[],
  s: ClassSummary,
  answers: Parameters<typeof indexResponses>[0],
  tt: (k: Key) => string,
) {
  const rows = indexResponses(answers);
  const domains = s.domains.map((d) => d.domain);
  const head = [
    tt("csv.roll"),
    tt("csv.name"),
    tt("csv.status"),
    tt("csv.score"),
    tt("csv.max"),
    tt("csv.percent"),
    tt("csv.group"),
    ...a.items.map((i) => i.label),
    ...domains.map((d) => `${d || tt("entry.noDomain")} %`),
    tt("csv.note"),
  ];
  const byId = new Map(students.map((x) => [x.id, x]));
  const body = s.results.map((r) => {
    const st = byId.get(r.studentId);
    return [
      st?.roll ?? "",
      st?.name ?? "",
      tt(`status.${r.status}`),
      r.status === "absent" ? null : r.score,
      r.max,
      r.status === "complete" ? percent(r.score, r.max) : null,
      s.quartile.get(r.studentId) ?? null,
      ...a.items.map((i) => rows.get(r.studentId)?.get(i.id) ?? null),
      ...domains.map((d) => {
        const x = r.byDomain.find((y) => y.domain === d);
        return r.status === "complete" && x ? percent(x.score, x.max) : null;
      }),
      r.note || null,
    ];
  });
  const name = `${a.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}-${a.date}.csv`;
  saveText(name, toCsv([head, ...body]), "text/csv");
}

export default function Results({ assessmentId }: { assessmentId: string }) {
  const { t, go, locale } = useApp();
  const { a, students, answers, summary: s } = useSummary(assessmentId);
  if (a === null) return <Empty title={t("common.notFound")} />;
  if (!a || !s || !students || !answers)
    return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
  const byId = new Map(students.map((x) => [x.id, x]));
  const notFinished = s.results.filter((r) => r.status === "partial" || r.status === "none").length;
  const avg = s.meanScore === null ? null : percent(Math.round(s.meanScore * 1000), s.max * 1000);

  return (
    <>
      <TopBar
        title={a.title}
        sub={`${a.subject} · ${formatDate(a.date)}`}
        back={`/class/${a.classId}`}
      />
      <main className="k-main">
        <div className="grid2">
          <Stat value={formatPercent(locale, avg)} label={t("results.average")} />
          <Stat
            value={formatPercent(locale, attendanceRate(s.attendance))}
            label={t("results.attendance", { absent: s.attendance.absent })}
          />
        </div>
        <p className="notice">
          {t("results.basis", {
            n: s.complete.length,
            absent: s.attendance.absent,
            open: notFinished,
          })}{" "}
          {notFinished > 0 ? (
            <button type="button" className="btn btn--sm" onClick={() => go(`/test/${a.id}/mark`)}>
              {t("test.continue")}
            </button>
          ) : null}
        </p>

        <div className="cluster no-print">
          <button type="button" className="btn btn--sm" onClick={() => go(`/test/${a.id}/report`)}>
            <Icon name="print" />
            {t("results.print")}
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => exportCsv(a, students, s, answers, t)}
          >
            <Icon name="download" />
            {t("results.csv")}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => go(`/test/${a.id}/grid`)}>
            <Icon name="grid" />
            {t("entry.grid")}
          </button>
        </div>

        {s.complete.length === 0 ? (
          <Empty title={t("results.none")} body={t("results.noneBody")} />
        ) : (
          <>
            <section className="card" aria-labelledby="dom-h">
              <h2 id="dom-h">{t("results.byDomain")}</h2>
              <Bars
                caption={t("results.byDomain")}
                data={s.domains.map((d) => {
                  const p = percent(d.score, d.max);
                  return {
                    key: d.domain,
                    label: d.domain || t("entry.noDomain"),
                    value: p,
                    text: formatPercent(locale, p),
                  };
                })}
              />
            </section>

            <section className="card" aria-labelledby="q-h">
              <h2 id="q-h">
                {a.kind === "key" ? t("results.byQuestion") : t("results.byCriterion")}
              </h2>
              <p className="small muted">{t("results.lowNote")}</p>
              <Bars
                caption={t("results.byQuestion")}
                data={s.items.map((st, i) => {
                  const it = a.items[i];
                  const p = percent(st.score, st.max);
                  let text = formatPercent(locale, p);
                  if (a.kind === "rubric" && s.complete.length)
                    text = formatNumber(locale, st.score / s.complete.length, 1);
                  return { key: st.itemId, label: it?.label ?? "", value: p, text };
                })}
              />
              {a.kind === "key" ? <CommonWrong a={a} s={s} /> : null}
            </section>

            {s.complete.length >= 4 ? (
              <section className="card" aria-labelledby="qt-h">
                <h2 id="qt-h">{t("results.groups")}</h2>
                <p className="small muted">{t("results.groupsNote")}</p>
                <div className="grid2">
                  {([4, 3, 2, 1] as const).map((g) => {
                    const members = s.complete
                      .filter((r) => s.quartile.get(r.studentId) === g)
                      .sort((x, y) => y.score - x.score);
                    return (
                      <div key={g} className="stack" style={{ gap: 6 }}>
                        <h3>{t(`results.group${g}`)}</h3>
                        <ul className="chips" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {members.map((r) => (
                            <li key={r.studentId}>
                              <button
                                type="button"
                                className="chip"
                                style={{ border: 0, cursor: "pointer" }}
                                onClick={() => go(`/student/${r.studentId}`)}
                              >
                                {byId.get(r.studentId)?.name}{" "}
                                <span className="num muted">
                                  {formatPercent(locale, percent(r.score, r.max))}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="card" aria-labelledby="help-h">
              <h2 id="help-h">{t("results.help")}</h2>
              {s.needsHelp.length === 0 ? (
                <p className="muted">{t("results.helpNone")}</p>
              ) : (
                s.needsHelp.map((h) => (
                  <div key={h.domain} className="stack" style={{ gap: 6 }}>
                    <h3>
                      {h.domain || t("entry.noDomain")}{" "}
                      <span className="muted small">
                        · {t("results.helpCount", { n: h.students.length })}
                      </span>
                    </h3>
                    <ul className="chips" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {h.students.map((x) => (
                        <li key={x.studentId} className="chip chip--genda">
                          {byId.get(x.studentId)?.name}{" "}
                          <span className="num">{formatPercent(locale, x.percent)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

/** For answer-key tests: the wrong option most of the class chose, a common misconception. */
function CommonWrong({ a, s }: { a: Assessment & { kind: "key" }; s: ClassSummary }) {
  const { t } = useApp();
  const notes = s.items
    .map((st, i) => {
      const it = a.items[i];
      if (it?.type !== "choice") return null;
      const wrong = Object.entries(st.counts)
        .filter(([v]) => v !== it.key && v !== "-")
        .sort((x, y) => y[1] - x[1])[0];
      if (!wrong || wrong[1] < Math.max(3, s.complete.length * 0.25)) return null;
      return { label: it.label, value: wrong[0], n: wrong[1] };
    })
    .filter((x): x is { label: string; value: string; n: number } => x !== null);
  if (!notes.length) return null;
  return (
    <div className="notice">
      <strong>{t("results.commonWrong")}</strong>
      <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
        {notes.map((n) => (
          <li key={n.label}>{t("results.commonWrongItem", { q: n.label, v: n.value, n: n.n })}</li>
        ))}
      </ul>
    </div>
  );
}
