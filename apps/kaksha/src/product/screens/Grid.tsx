"use client";
// Every student against every question at once, for checking and correcting.
// Rows use content-visibility, so a 50 x 30 sheet stays light on cheap phones.
import { useMemo } from "react";
import { formatPercent } from "../../i18n";
import { BLANK } from "../../lib/model";
import { indexResponses, itemPoints, percent, studentResult } from "../../lib/scoring";
import { useApp } from "../context";
import { useAnswers, useAssessment, useSittings, useStudents } from "../data";
import { Empty, Icon, NotFound, TopBar } from "../ui";

export default function Grid({ assessmentId }: { assessmentId: string }) {
  const { t, go, locale } = useApp();
  const a = useAssessment(assessmentId);
  const students = useStudents(a?.classId, locale);
  const answers = useAnswers(a?.id);
  const sittings = useSittings(a?.id);
  const rows = useMemo(() => indexResponses(answers ?? []), [answers]);

  if (a === null) return <NotFound />;
  if (!a || !students || !answers || !sittings)
    return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
  const absent = new Set(sittings.filter((s) => s.absent).map((s) => s.studentId));
  const shown = students.filter((s) => s.active || rows.has(s.id) || absent.has(s.id));

  return (
    <>
      <TopBar
        title={a.title}
        sub={t("grid.sub")}
        back={`/test/${a.id}/mark`}
        actions={
          <button
            type="button"
            className="icon-btn"
            onClick={() => go(`/test/${a.id}`)}
            aria-label={t("test.results")}
          >
            <Icon name="chart" />
          </button>
        }
      />
      <main className="k-main k-main--wide">
        <p className="small muted">{t("grid.hint")}</p>
        <div className="grid-wrap" tabIndex={-1}>
          <table className="mgrid">
            <caption className="sr-only">{t("grid.caption", { title: a.title })}</caption>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: "left" }}>
                  {t("grid.student")}
                </th>
                {a.items.map((it) => (
                  <th key={it.id} scope="col" title={it.domain}>
                    <span className="num">{it.label}</span>
                  </th>
                ))}
                <th scope="col">{t("grid.total")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => {
                const row = rows.get(s.id);
                const isAbsent = absent.has(s.id);
                const res = studentResult(
                  a,
                  s.id,
                  row,
                  isAbsent
                    ? { id: "", assessmentId: a.id, studentId: s.id, absent: true, note: "" }
                    : undefined,
                );
                return (
                  <tr key={s.id}>
                    <th scope="row">
                      <span className="num muted">{s.roll}</span> {s.name}
                    </th>
                    {a.items.map((it) => {
                      const v = row?.get(it.id);
                      const pts = itemPoints(it, v);
                      const cls = isAbsent
                        ? "c-absent"
                        : v === undefined
                          ? ""
                          : pts
                            ? "c-right"
                            : "c-wrong";
                      const shownValue = isAbsent
                        ? t("entry.absentShort")
                        : v === undefined
                          ? ""
                          : v === BLANK
                            ? "–"
                            : v === "R"
                              ? "✓"
                              : v === "W"
                                ? "✗"
                                : v;
                      return (
                        <td key={it.id} className={cls}>
                          <button
                            type="button"
                            onClick={() => go(`/test/${a.id}/mark/${s.id}~${it.id}`)}
                            aria-label={`${s.name}, ${it.label}: ${shownValue || t("entry.notEntered")}`}
                          >
                            {shownValue}
                          </button>
                        </td>
                      );
                    })}
                    <td className="num" style={{ padding: "0 8px", whiteSpace: "nowrap" }}>
                      {isAbsent
                        ? t("entry.absentShort")
                        : res.status === "complete"
                          ? formatPercent(locale, percent(res.score, res.max))
                          : `${res.entered}/${res.items}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
