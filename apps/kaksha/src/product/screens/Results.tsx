"use client";
import { useEffect, useMemo } from "react";
import { formatDate, formatNumber, formatPercent, type Key } from "../../i18n";
import { toCsv } from "../../lib/csv";
import { deleteAssessment, snapshotAssessment } from "../../lib/db";
import type { Assessment, Student } from "../../lib/model";
import { type ClassSummary, classSummary, indexResponses, percent } from "../../lib/scoring";
import { useApp } from "../context";
import { DeleteButton } from "../DeleteButton";
import {
  useAnswers,
  useAssessment,
  useAssessments,
  useClassRecords,
  useSittings,
  useStudents,
} from "../data";
import { demoStep } from "../demoBridge";
import { saveText } from "../files";
import { Empty, Icon, Meter, NotFound, Pill, TopBar } from "../ui";

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

const TABS = ["overview", "questions", "skills", "groups"] as const;
type Tab = (typeof TABS)[number];

export default function Results({
  assessmentId,
  tab,
  item,
}: {
  assessmentId: string;
  tab?: string | undefined;
  item?: string | undefined;
}) {
  const { t, go } = useApp();
  const { a, students, answers, summary: s } = useSummary(assessmentId);
  const current: Tab = (TABS as readonly string[]).includes(tab ?? "") ? (tab as Tab) : "overview";
  const ready = Boolean(s && s.complete.length > 0);
  useEffect(() => {
    if (ready) demoStep("results");
  }, [ready]);
  if (a === null) return <NotFound />;
  if (!a || !s || !students || !answers)
    return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
  const byId = new Map(students.map((x) => [x.id, x]));
  const sub = `${a.subject} · ${formatDate(a.date)} · ${
    a.kind === "key"
      ? t("test.kind.key", { n: a.items.length })
      : t("test.kind.rubric", { n: a.items.length })
  }`;

  if (current === "questions" && item) {
    return <QuestionDetail a={a} s={s} answers={answers} byId={byId} itemId={item} />;
  }

  return (
    <>
      <TopBar
        title={a.title}
        sub={sub}
        back={`/class/${a.classId}`}
        actions={
          <>
            <button
              type="button"
              className="icon-btn"
              onClick={() => go(`/test/${a.id}/report`)}
              aria-label={t("results.print")}
            >
              <Icon name="print" />
            </button>
            <DeleteButton
              label={t("del.test")}
              name={a.title}
              load={() => snapshotAssessment(a.id)}
              describe={(snap) =>
                t("del.testBody", {
                  marks: snap.responses?.length ?? 0,
                  students: new Set(
                    (snap.responses as Array<{ studentId: string }> | undefined)?.map(
                      (r) => r.studentId,
                    ),
                  ).size,
                })
              }
              remove={() => deleteAssessment(a.id)}
              after={() => go(`/class/${a.classId}`, true)}
            />
          </>
        }
      />
      <div className="tabs tabs--sticky" role="tablist" aria-label={a.title}>
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`rtab-${k}`}
            aria-selected={current === k}
            aria-controls={`rpanel-${k}`}
            onClick={() => go(`/test/${a.id}/${k}`, true)}
          >
            {t(`results.tab.${k}`)}
          </button>
        ))}
      </div>
      <main
        className="k-main"
        role="tabpanel"
        id={`rpanel-${current}`}
        aria-labelledby={`rtab-${current}`}
      >
        {s.complete.length === 0 ? (
          <Empty title={t("results.none")} body={t("results.noneBody")}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => go(`/test/${a.id}/mark`)}
            >
              {t("test.continue")}
            </button>
          </Empty>
        ) : current === "overview" ? (
          <Overview a={a} s={s} students={students} answers={answers} byId={byId} />
        ) : current === "questions" ? (
          <Questions a={a} s={s} />
        ) : current === "skills" ? (
          <Skills a={a} s={s} />
        ) : (
          <Groups a={a} s={s} byId={byId} />
        )}
      </main>
    </>
  );
}

type ById = Map<string, Student>;

function Overview({
  a,
  s,
  students,
  answers,
  byId,
}: {
  a: Assessment;
  s: ClassSummary;
  students: Student[];
  answers: Parameters<typeof indexResponses>[0];
  byId: ById;
}) {
  const { t, go, locale } = useApp();
  const avg = s.meanScore === null ? null : percent(Math.round(s.meanScore * 1000), s.max * 1000);
  const notFinished = s.results.filter((r) => r.status === "partial" || r.status === "none");
  const absent = s.results.filter((r) => r.status === "absent");

  // Five bands of marks.
  const bands = Array.from({ length: 5 }, (_, i) => {
    const lo = Math.round((s.max * i) / 5) + (i ? 1 : 0);
    const hi = Math.round((s.max * (i + 1)) / 5);
    return { lo, hi, n: 0 };
  });
  for (const r of s.complete) {
    const b = bands.find((x) => r.score >= x.lo && r.score <= x.hi) ?? bands[bands.length - 1];
    if (b) b.n += 1;
  }
  const peak = Math.max(1, ...bands.map((b) => b.n));

  const hard = s.items
    .map((st, i) => ({ label: a.items[i]?.label ?? "", p: percent(st.score, st.max) }))
    .filter((x) => x.p !== null && x.p < 50)
    .map((x) => x.label);
  const weakest = [...s.needsHelp].sort((x, y) => y.students.length - x.students.length)[0];
  const names = (rs: typeof absent) =>
    rs
      .map((r) => byId.get(r.studentId)?.name.split(" ")[0])
      .filter(Boolean)
      .join(", ");

  return (
    <>
      <div className="pair">
        <div className="stat stat--ink">
          <span className="stat__value num">{formatPercent(locale, avg)}</span>
          <span className="stat__label">{t("results.average")}</span>
        </div>
        <div className="stat">
          <span className="stat__value num">
            {s.complete.length}/{s.results.length}
          </span>
          <span className="stat__label">{t("results.marked")}</span>
        </div>
      </div>

      {a.kind === "key" ? (
        <section className="card" aria-labelledby="hist-h">
          <h2 id="hist-h">{t("results.howScored")}</h2>
          <div className="hist" role="img" aria-label={t("results.histLabel", { max: s.max })}>
            {bands.map((b, i) => (
              <div key={`${b.lo}-${b.hi}`} className="hist__col">
                <span className="hist__n num">{b.n}</span>
                <span
                  className="hist__bar"
                  data-low={i < 2}
                  style={{ height: `${Math.max(4, (b.n / peak) * 100)}%` }}
                />
                <span className="hist__label num">
                  {b.lo}–{b.hi}
                </span>
              </div>
            ))}
          </div>
          <p className="small muted">{t("results.histCaption", { max: s.max })}</p>
        </section>
      ) : null}

      {hard.length || weakest ? (
        <section className="card card--warn" aria-labelledby="look-h">
          <h2 id="look-h">{t("results.worthLook")}</h2>
          <p className="small">
            {hard.length ? t("results.hardQs", { qs: hard.slice(0, 4).join(", ") }) : null}{" "}
            {weakest
              ? t("results.weakSkill", {
                  n: weakest.students.length,
                  skill: weakest.domain || t("entry.noDomain"),
                })
              : null}
          </p>
        </section>
      ) : null}

      <p className="notice small">
        {t("results.basisShort", { n: s.complete.length })}{" "}
        {absent.length ? t("results.absentNames", { names: names(absent) }) : null}{" "}
        {notFinished.length ? t("results.openCount", { n: notFinished.length }) : null}
      </p>

      <div className="cluster no-print">
        {notFinished.length ? (
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => go(`/test/${a.id}/mark`)}
          >
            {t("test.continue")}
          </button>
        ) : null}
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
    </>
  );
}

function commonWrong(a: Assessment, st: ClassSummary["items"][number], i: number) {
  if (a.kind !== "key") return null;
  const it = a.items[i];
  if (it?.type !== "choice") return null;
  const wrong = Object.entries(st.counts)
    .filter(([v]) => v !== it.key && v !== "-")
    .sort((x, y) => y[1] - x[1])[0];
  const total = Object.values(st.counts).reduce((x, y) => x + y, 0);
  if (!wrong || wrong[1] < Math.max(3, total * 0.25)) return null;
  return { value: wrong[0], n: wrong[1] };
}

function Questions({ a, s }: { a: Assessment; s: ClassSummary }) {
  const { t, go, locale } = useApp();
  return (
    <>
      <p className="small muted">
        {a.kind === "key" ? t("results.qShare") : t("results.byCriterion")}
      </p>
      <ul className="qlist">
        {s.items.map((st, i) => {
          const it = a.items[i];
          const p = percent(st.score, st.max);
          const cw = commonWrong(a, st, i);
          const low = p !== null && p < 50;
          let text = formatPercent(locale, p);
          if (a.kind === "rubric" && s.complete.length)
            text = formatNumber(locale, st.score / s.complete.length, 1);
          return (
            <li key={st.itemId}>
              <button
                type="button"
                className="qrow"
                data-low={low}
                onClick={() => go(`/test/${a.id}/questions/${st.itemId}`)}
              >
                <span className="qrow__label num">{it?.label}</span>
                <span className="qrow__mid">
                  <Meter value={p} />
                  {cw ? (
                    <span className="qrow__note">{t("results.mostChose", { v: cw.value })}</span>
                  ) : null}
                </span>
                <span className="qrow__value num">{text}</span>
                <span className="chev">
                  <Icon name="chev" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {a.kind === "key" ? <CommonWrong a={a} s={s} /> : null}
    </>
  );
}

function QuestionDetail({
  a,
  s,
  answers,
  byId,
  itemId,
}: {
  a: Assessment;
  s: ClassSummary;
  answers: Parameters<typeof indexResponses>[0];
  byId: ById;
  itemId: string;
}) {
  const { t, go, locale } = useApp();
  const i = a.items.findIndex((x) => x.id === itemId);
  const it = a.items[i];
  const st = s.items[i];
  if (!it || !st) return <NotFound />;
  const p = percent(st.score, st.max);
  const total = Object.values(st.counts).reduce((x, y) => x + y, 0);
  const complete = new Set(s.complete.map((r) => r.studentId));
  const rows = indexResponses(answers.filter((r) => complete.has(r.studentId)));
  let options: Array<{ v: string; label: string; right: boolean }>;
  if (a.kind === "key" && "key" in it) {
    options =
      it.type === "choice"
        ? ["A", "B", "C", "D"].map((v) => ({ v, label: v, right: v === it.key }))
        : [
            { v: "R", label: t("entry.right"), right: true },
            { v: "W", label: t("entry.wrong"), right: false },
          ];
  } else if ("levels" in it) {
    options = [...it.levels].reverse().map((l) => ({
      v: String(l.score),
      label: `${l.score} · ${l.label}`,
      right: false,
    }));
  } else options = [];
  options.push({ v: "-", label: t("entry.blank"), right: false });
  const cw = commonWrong(a, st, i);
  const chose = (v: string) =>
    [...rows.entries()].filter(([, m]) => (m.get(itemId) ?? "-") === v).map(([sid]) => sid);
  const focus = cw ? chose(cw.value) : [];
  const right =
    a.kind === "key" ? Math.round(st.score / Math.max(1, "marks" in it ? it.marks : 1)) : 0;

  return (
    <>
      <TopBar
        title={
          a.kind === "key" && /^\d/.test(it.label)
            ? t("results.questionN", { q: it.label })
            : it.label
        }
        sub={`${a.title}${it.domain ? ` · ${it.domain}` : ""}`}
        back={`/test/${a.id}/questions`}
      />
      <main className="k-main">
        <div className="bigstat">
          <span className="bigstat__value num" data-low={p !== null && p < 50}>
            {formatPercent(locale, p)}
          </span>
          {a.kind === "key" ? (
            <span className="bigstat__label">
              {t("results.gotRight", { n: right, total: s.complete.length })}
            </span>
          ) : null}
        </div>
        <section className="card" aria-labelledby="chose-h">
          <h2 id="chose-h">{t("results.whatChose")}</h2>
          <ul className="optlist">
            {options.map((o) => {
              const n = st.counts[o.v] ?? 0;
              const share = total ? (n / total) * 100 : 0;
              const most = cw?.value === o.v;
              return (
                <li key={o.v} data-right={o.right} data-most={most}>
                  <span className="optlist__key">{o.label}</span>
                  <span className="optlist__mid">
                    <Meter value={share} tone={o.right ? "ink" : most ? "genda" : "ink"} />
                    {o.right ? (
                      <span className="optlist__tag optlist__tag--right">
                        {t("results.rightAnswer")}
                      </span>
                    ) : most ? (
                      <span className="optlist__tag">{t("results.mostCommon")}</span>
                    ) : null}
                  </span>
                  <span className="num">{formatPercent(locale, Math.round(share))}</span>
                </li>
              );
            })}
          </ul>
        </section>
        {cw && focus.length ? (
          <section className="card" aria-labelledby="who-h">
            <h2 id="who-h">{t("results.choseN", { v: cw.value, n: focus.length })}</h2>
            <ul className="chips" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {focus.map((sid) => (
                <li key={sid}>
                  <button
                    type="button"
                    className="chip chip--btn"
                    onClick={() => go(`/student/${sid}`)}
                  >
                    {byId.get(sid)?.name.split(" ")[0]}
                  </button>
                </li>
              ))}
            </ul>
            <p className="small muted">{t("results.mixup")}</p>
          </section>
        ) : null}
      </main>
    </>
  );
}

function Skills({ a, s }: { a: Assessment; s: ClassSummary }) {
  const { t, locale } = useApp();
  const tests = useAssessments(a.classId);
  const records = useClassRecords(a.classId);
  const students = useStudents(a.classId, locale);
  // The previous test in the same subject, for "since last time".
  const prev = useMemo(() => {
    if (!tests || !records || !students) return null;
    const earlier = tests
      .filter((x) => x.id !== a.id && x.subject === a.subject && x.date <= a.date)
      .sort((x, y) => y.date.localeCompare(x.date))[0];
    if (!earlier) return null;
    const sum = classSummary(
      earlier,
      students,
      records.answers.filter((r) => r.assessmentId === earlier.id),
      records.sittings.filter((r) => r.assessmentId === earlier.id),
    );
    return {
      test: earlier,
      domains: new Map(sum.domains.map((d) => [d.domain, percent(d.score, d.max)])),
    };
  }, [tests, records, students, a]);

  const ranges = new Map<string, string[]>();
  for (const it of a.items) {
    const list = ranges.get(it.domain) ?? [];
    list.push(it.label);
    ranges.set(it.domain, list);
  }
  const span = (labels: string[]) =>
    labels.length > 1 ? `${labels[0]}–${labels[labels.length - 1]}` : (labels[0] ?? "");

  return (
    <ul className="list list--gap">
      {s.domains.map((d) => {
        const p = percent(d.score, d.max);
        const before = prev?.domains.get(d.domain);
        const delta =
          p !== null && before !== null && before !== undefined ? Math.round(p - before) : null;
        const low = p !== null && p < 50;
        return (
          <li key={d.domain} className="card skill" data-low={low}>
            <div className="spread">
              <strong>{d.domain || t("entry.noDomain")}</strong>
              <span className="skill__p num">{formatPercent(locale, p)}</span>
            </div>
            <Meter value={p} />
            <div className="cluster">
              <span className="small muted num">{span(ranges.get(d.domain) ?? [])}</span>
              {prev ? (
                delta === null ? (
                  <Pill>{t("results.firstTime")}</Pill>
                ) : (
                  <Pill tone={delta >= 0 ? "right" : "wrong"}>
                    {t(delta >= 0 ? "results.up" : "results.down", {
                      n: Math.abs(delta),
                      test: prev.test.title,
                    })}
                  </Pill>
                )
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Groups({ a, s, byId }: { a: Assessment; s: ClassSummary; byId: ById }) {
  const { t, go, locale } = useApp();
  if (s.complete.length < 4) return <p className="notice">{t("results.groupsFew")}</p>;
  return (
    <>
      <p className="small muted">{t("results.groupsNote")}</p>
      <ul className="list list--gap">
        {([4, 3, 2, 1] as const).map((g) => {
          const members = s.complete
            .filter((r) => s.quartile.get(r.studentId) === g)
            .sort((x, y) => y.score - x.score);
          if (!members.length) return null;
          const lo = Math.min(...members.map((m) => m.score));
          const hi = Math.max(...members.map((m) => m.score));
          return (
            <li key={g} className="card group" data-g={g}>
              <div className="spread">
                <strong>
                  <span className="group__dot" aria-hidden="true" />
                  {t(`results.group${g}`)}
                </strong>
                <span className="small num">
                  {t("results.marksRange", {
                    lo: formatNumber(locale, lo),
                    hi: formatNumber(locale, hi),
                  })}
                </span>
              </div>
              <ul className="chips" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {members.map((r) => (
                  <li key={r.studentId}>
                    <button
                      type="button"
                      className="chip chip--btn"
                      onClick={() => go(`/student/${r.studentId}`)}
                    >
                      {byId.get(r.studentId)?.name}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
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
      <div className="cluster no-print">
        <button type="button" className="btn btn--sm" onClick={() => go(`/test/${a.id}/report`)}>
          <Icon name="print" />
          {t("results.print")}
        </button>
      </div>
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
