"use client";
// Printable report card and class summary. The browser's own print engine makes the
// PDF ("Save as PDF" in the print dialog), on the phone, with no extra download: it
// shapes Hindi correctly, keeps the text selectable, and works offline.
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { PRODUCT_NAME } from "../../config";
import {
  formatDate,
  formatNumber,
  formatPercent,
  isLoaded,
  type Key,
  LOCALES,
  type Locale,
  loadLocale,
  translate,
} from "../../i18n";
import { db } from "../../lib/db";
import type {
  Answer,
  Assessment,
  ClassGroup,
  School,
  Sitting,
  Student,
  StudentNote,
} from "../../lib/model";
import { attendanceRate, percent, studentDomains, studentResult } from "../../lib/scoring";
import { useApp } from "../context";
import { useAssessments, useClass, useClassRecords, useNotes, useStudents } from "../data";
import { demoStep } from "../demoBridge";
import { Empty, Icon, Mark, Toggle, TopBar } from "../ui";
import { useSummary } from "./Results";
import { useStudentView } from "./StudentScreen";

const PRINT_CSS = `
.report { background: #fff; color: #111; border: 1px solid var(--rule); border-radius: 12px; padding: 28px; display: flex; flex-direction: column; gap: 18px; }
.report h1 { font-size: 1.4rem; }
.report .tw { overflow-x: auto; }
.report table { width: 100%; min-width: 300px; border-collapse: collapse; font-size: 0.95rem; }
.report th, .report td { border-bottom: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
.report th { font-weight: 600; background: #f3efe6; }
.report td.r, .report th.r { text-align: right; white-space: nowrap; }
.report .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px 18px; }
.report .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; }
.report .sign span { border-top: 1px solid #333; padding-top: 4px; font-size: 0.85rem; }
.report footer { font-size: 0.8rem; color: #555; display: flex; justify-content: space-between; gap: 12px; }
.cards-print { display: flex; flex-direction: column; gap: 20px; }
@media print {
  @page { size: A4; margin: 14mm; }
  .cards-print .report { break-after: page; }
  .cards-print .report:last-child { break-after: auto; }
  .report { border: 0; padding: 0; }
  .k-main { padding: 0; max-width: none; }
  .report tr { break-inside: avoid; }
}
`;

export default function Report({ kind, id }: { kind: "student" | "class" | "cards"; id: string }) {
  if (kind === "student") return <StudentReport studentId={id} />;
  if (kind === "cards") return <ClassCards classId={id} />;
  return <ClassReport assessmentId={id} />;
}

function PrintBar({ back, title }: { back: string; title: string }) {
  const { t } = useApp();
  return (
    <>
      <style>{PRINT_CSS}</style>
      <TopBar title={title} back={back} />
      <div className="k-main no-print" style={{ paddingBottom: 0 }}>
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          <Icon name="print" />
          {t("report.print")}
        </button>
        <p className="small muted">{t("report.printHint")}</p>
      </div>
    </>
  );
}

interface CardOptions {
  lang: Locale;
  skills: boolean;
  notes: boolean;
  attendance: boolean;
  sign: boolean;
}

const DEFAULT_OPTIONS = (lang: Locale): CardOptions => ({
  lang,
  skills: true,
  notes: true,
  attendance: true,
  sign: true,
});

/** Strings for the card in the card's own language, which may differ from the app's. */
function useCardT(lang: Locale) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!isLoaded(lang)) void loadLocale(lang).then(() => tick((n) => n + 1));
  }, [lang]);
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

function ReportCard({
  student,
  tests,
  records,
  info,
  notes,
  opts,
}: {
  student: Student;
  tests: Assessment[];
  records: { answers: Answer[]; sittings: Sitting[] };
  info: { cls: ClassGroup; school: School | undefined };
  notes: StudentNote[];
  opts: CardOptions;
}) {
  const t = useCardT(opts.lang);
  const locale = opts.lang;
  const ordered = [...tests].sort((a, b) => a.date.localeCompare(b.date));
  const rows = ordered.map((a) => {
    const row = new Map(
      records.answers
        .filter((r) => r.assessmentId === a.id && r.studentId === student.id)
        .map((r) => [r.itemId, r.value]),
    );
    const sitting = records.sittings.find(
      (s) => s.assessmentId === a.id && s.studentId === student.id,
    );
    return { a, res: studentResult(a, student.id, row, sitting) };
  });
  const domains = studentDomains(tests, student.id, records.answers, records.sittings)
    .map((d) => ({ ...d, p: percent(d.score, d.max) }))
    .sort((x, y) => (y.p ?? 0) - (x.p ?? 0));
  const strengths = domains.filter((d) => (d.p ?? 0) >= 75);
  const gaps = domains.filter((d) => (d.p ?? 0) < 50);
  const testNotes = rows.filter((r) => r.res.note);
  const cardNotes = notes.filter((n) => n.onCard);
  const sat = rows.filter((r) => r.res.status !== "absent" && r.res.status !== "none").length;
  const absent = rows.filter((r) => r.res.status === "absent").length;
  const list = (xs: typeof domains) =>
    xs.length
      ? xs
          .map((d) => `${d.domain || t("entry.noDomain")} (${formatPercent(locale, d.p)})`)
          .join(", ")
      : t("report.none");

  return (
    <article
      className="report"
      aria-label={`${t("student.report")}: ${student.name}`}
      lang={locale}
    >
      <div className="spread">
        <div>
          <p className="small" style={{ color: "#555" }}>
            {info.school?.name}
          </p>
          <h1>{t("report.cardTitle")}</h1>
        </div>
        <Mark size={44} />
      </div>
      <div className="meta">
        <span>
          <strong>{t("report.student")}:</strong> {student.name}
        </span>
        <span>
          <strong>{t("report.roll")}:</strong> <span className="num">{student.roll}</span>
        </span>
        <span>
          <strong>{t("report.class")}:</strong>{" "}
          {t("class.label", { grade: info.cls.grade, section: info.cls.section })}
        </span>
        <span>
          <strong>{t("report.year")}:</strong> <span className="num">{info.cls.year}</span>
        </span>
      </div>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable */}
      <section className="tw" tabIndex={0} aria-label={t("report.table")}>
        <table>
          <thead>
            <tr>
              <th>{t("report.date")}</th>
              <th>{t("report.test")}</th>
              <th className="r">{t("report.marks")}</th>
              <th className="r">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, res }) => (
              <tr key={a.id}>
                <td className="num">{formatDate(a.date)}</td>
                <td>
                  {a.title}
                  <div className="small" style={{ color: "#555" }}>
                    {a.subject}
                  </div>
                </td>
                <td className="r num">
                  {res.status === "absent"
                    ? t("entry.absent")
                    : res.status === "complete"
                      ? `${formatNumber(locale, res.score)} / ${formatNumber(locale, res.max)}`
                      : t("status.partial")}
                </td>
                <td className="r num">
                  {res.status === "complete"
                    ? formatPercent(locale, percent(res.score, res.max))
                    : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {opts.skills ? (
        <div className="grid2">
          <div>
            <h2>{t("report.strengths")}</h2>
            <p>{list(strengths)}</p>
          </div>
          <div>
            <h2>{t("report.gaps")}</h2>
            <p>{list(gaps)}</p>
          </div>
        </div>
      ) : null}
      {opts.attendance ? (
        <p>
          <strong>{t("report.attendance")}:</strong>{" "}
          {t("report.attendanceLine", { sat, absent, total: rows.length })}
        </p>
      ) : null}
      {opts.notes && (testNotes.length || cardNotes.length) ? (
        <div>
          <h2>{t("report.notes")}</h2>
          <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
            {cardNotes.map((n) => (
              <li key={n.id}>{n.text}</li>
            ))}
            {testNotes.map((n) => (
              <li key={n.a.id}>
                <strong>{n.a.title}:</strong> {n.res.note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {opts.sign ? (
        <div className="sign">
          <span>{t("report.teacherSign")}</span>
          <span>{t("report.parentSign")}</span>
        </div>
      ) : null}
      <footer>
        <span>{t("report.footer", { product: PRODUCT_NAME })}</span>
        <span className="num">{formatDate(new Date().toISOString().slice(0, 10))}</span>
      </footer>
    </article>
  );
}

function CardOptionsPanel({
  opts,
  setOpts,
}: {
  opts: CardOptions;
  setOpts: (o: CardOptions) => void;
}) {
  const { t } = useApp();
  return (
    <details className="card no-print opts">
      <summary>
        <strong>{t("report.options")}</strong>
        <span className="small muted">{t("report.optionsSub")}</span>
      </summary>
      <div className="field">
        <span className="label" id="card-lang">
          {t("report.cardLanguage")}
        </span>
        <fieldset className="seg" aria-labelledby="card-lang">
          {(Object.keys(LOCALES) as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={opts.lang === l}
              lang={LOCALES[l].intl.split("-")[0]}
              onClick={() => setOpts({ ...opts, lang: l })}
            >
              {LOCALES[l].label}
            </button>
          ))}
        </fieldset>
      </div>
      <Toggle
        on={opts.skills}
        onChange={(skills) => setOpts({ ...opts, skills })}
        label={t("report.optSkills")}
      />
      <Toggle
        on={opts.notes}
        onChange={(notes) => setOpts({ ...opts, notes })}
        label={t("report.optNotes")}
      />
      <Toggle
        on={opts.attendance}
        onChange={(attendance) => setOpts({ ...opts, attendance })}
        label={t("report.optAttendance")}
      />
      <Toggle
        on={opts.sign}
        onChange={(sign) => setOpts({ ...opts, sign })}
        label={t("report.optSign")}
      />
    </details>
  );
}

function StudentReport({ studentId }: { studentId: string }) {
  const { t, locale } = useApp();
  const { student, tests, records } = useStudentView(studentId);
  const info = useClass(student?.classId ?? "");
  const notes = useNotes(studentId);
  const [opts, setOpts] = useState<CardOptions>(() => DEFAULT_OPTIONS(locale));
  useEffect(() => {
    if (student) demoStep("report");
  }, [student]);
  if (student === null) return <Empty title={t("common.notFound")} />;
  if (!student || !tests || !records || !info || !notes)
    return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
  return (
    <>
      <PrintBar back={`/student/${student.id}`} title={t("student.report")} />
      <main className="k-main">
        <CardOptionsPanel opts={opts} setOpts={setOpts} />
        <ReportCard
          student={student}
          tests={tests}
          records={records}
          info={info}
          notes={notes}
          opts={opts}
        />
      </main>
    </>
  );
}

/** Every child's card in one print job, one per page. */
function ClassCards({ classId }: { classId: string }) {
  const { t, locale } = useApp();
  const info = useClass(classId);
  const students = useStudents(classId, locale);
  const tests = useAssessments(classId);
  const records = useClassRecords(classId);
  const notes = useLiveQuery(async () => {
    const ids = (students ?? []).map((s) => s.id);
    return ids.length ? db().notes.where("studentId").anyOf(ids).toArray() : [];
  }, [students]);
  const [opts, setOpts] = useState<CardOptions>(() => DEFAULT_OPTIONS(locale));
  if (info === null) return <Empty title={t("common.notFound")} />;
  if (!info || !students || !tests || !records || !notes)
    return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
  const active = students.filter((s) => s.active);
  return (
    <>
      <PrintBar back={`/class/${classId}/reports`} title={t("reports.allCards")} />
      <main className="k-main">
        <p className="small muted no-print">{t("reports.allCardsBody", { n: active.length })}</p>
        <CardOptionsPanel opts={opts} setOpts={setOpts} />
        <div className="cards-print">
          {active.map((s) => (
            <ReportCard
              key={s.id}
              student={s}
              tests={tests}
              records={records}
              info={info}
              notes={notes.filter((n) => n.studentId === s.id)}
              opts={opts}
            />
          ))}
        </div>
      </main>
    </>
  );
}

function ClassReport({ assessmentId }: { assessmentId: string }) {
  const { t, locale } = useApp();
  const { a, students, summary: s } = useSummary(assessmentId);
  const info = useClass(a?.classId ?? "");
  const school = useLiveQuery(
    async () => (info?.cls ? db().schools.get(info.cls.schoolId) : undefined),
    [info?.cls.schoolId],
  );
  if (a === null) return <Empty title={t("common.notFound")} />;
  if (!a || !s || !students || !info)
    return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
  const byId = new Map(students.map((x) => [x.id, x]));
  const avg = s.meanScore === null ? null : percent(Math.round(s.meanScore * 1000), s.max * 1000);
  return (
    <>
      <PrintBar back={`/test/${a.id}`} title={t("results.print")} />
      <main className="k-main">
        <article className="report" aria-label={t("results.print")}>
          <div className="spread">
            <div>
              <p className="small" style={{ color: "#555" }}>
                {school?.name} ·{" "}
                {t("class.label", { grade: info.cls.grade, section: info.cls.section })} ·{" "}
                <span className="num">{info.cls.year}</span>
              </p>
              <h1>{a.title}</h1>
              <p className="small">
                {a.subject} · <span className="num">{formatDate(a.date)}</span>
              </p>
            </div>
            <Mark size={44} />
          </div>
          <div className="meta">
            <span>
              <strong>{t("results.average")}:</strong>{" "}
              <span className="num">{formatPercent(locale, avg)}</span>
            </span>
            <span>
              <strong>{t("progress.attendance")}:</strong>{" "}
              <span className="num">{formatPercent(locale, attendanceRate(s.attendance))}</span>
            </span>
            <span>
              {t("results.basis", {
                n: s.complete.length,
                absent: s.attendance.absent,
                open: s.results.length - s.complete.length - s.attendance.absent,
              })}
            </span>
          </div>
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable */}
          <section className="tw" tabIndex={0} aria-label={t("report.table")}>
            <table>
              <thead>
                <tr>
                  <th>{t("results.byDomain")}</th>
                  <th className="r">%</th>
                </tr>
              </thead>
              <tbody>
                {s.domains.map((d) => (
                  <tr key={d.domain}>
                    <td>{d.domain || t("entry.noDomain")}</td>
                    <td className="r num">{formatPercent(locale, percent(d.score, d.max))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable */}
          <section className="tw" tabIndex={0} aria-label={t("report.table")}>
            <table>
              <thead>
                <tr>
                  <th>{t("report.roll")}</th>
                  <th>{t("report.student")}</th>
                  <th className="r">{t("report.marks")}</th>
                  <th className="r">%</th>
                  <th className="r">{t("report.group")}</th>
                </tr>
              </thead>
              <tbody>
                {s.results.map((r) => {
                  const st = byId.get(r.studentId);
                  return (
                    <tr key={r.studentId}>
                      <td className="num">{st?.roll}</td>
                      <td>{st?.name}</td>
                      <td className="r num">
                        {r.status === "absent"
                          ? t("entry.absent")
                          : r.status === "complete"
                            ? `${formatNumber(locale, r.score)} / ${formatNumber(locale, r.max)}`
                            : t("status.partial")}
                      </td>
                      <td className="r num">
                        {r.status === "complete"
                          ? formatPercent(locale, percent(r.score, r.max))
                          : "–"}
                      </td>
                      <td className="r num">
                        {s.complete.length >= 4 ? (s.quartile.get(r.studentId) ?? "–") : "–"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <footer>
            <span>{t("report.footer", { product: PRODUCT_NAME })}</span>
            <span className="num">{formatDate(new Date().toISOString().slice(0, 10))}</span>
          </footer>
        </article>
      </main>
    </>
  );
}
