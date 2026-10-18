"use client";
// Across tests: who sat each test, children below half twice running, skills so far.
import { useState } from "react";
import { formatPercent, formatShortMonth } from "../../i18n";
import { percent } from "../../lib/scoring";
import { Bars } from "../charts";
import { useApp } from "../context";
import { type ClassOverview, useOverview } from "../data";
import { Empty, Icon, PageHead, TabBar } from "../ui";

export default function Insights() {
  const { t, go, locale } = useApp();
  const overview = useOverview(locale);
  const [pick, setPick] = useState<string>("first");
  if (!overview) return null;
  const chosen: ClassOverview[] =
    pick === "all"
      ? overview
      : overview.filter((o) => o.cls.id === (pick === "first" ? overview[0]?.cls.id : pick));
  const many = chosen.length > 1;
  const label = (o: ClassOverview) =>
    t("class.label", { grade: o.cls.grade, section: o.cls.section }).trim();

  // Who sat each test, oldest first.
  const sat = chosen
    .flatMap((o) => o.tests.map((x) => ({ ...x, o })))
    .sort((a, b) => a.a.date.localeCompare(b.a.date))
    .slice(-8);

  // Children below half in their last two finished tests.
  const twice: Array<{
    id: string;
    name: string;
    roll: string;
    cls: string;
    last: number;
    skills: string[];
  }> = [];
  for (const o of chosen) {
    const ordered = [...o.tests].sort((a, b) => a.a.date.localeCompare(b.a.date));
    for (const s of o.students) {
      if (!s.active) continue;
      const done = ordered
        .map((x) => ({ x, r: x.summary.complete.find((r) => r.studentId === s.id) }))
        .filter((y) => y.r);
      const lastTwo = done.slice(-2);
      if (lastTwo.length < 2) continue;
      const ps = lastTwo.map((y) => (y.r ? (percent(y.r.score, y.r.max) ?? 100) : 100));
      if (ps.every((p) => p < 50)) {
        const latest = lastTwo[1]?.r;
        twice.push({
          id: s.id,
          name: s.name,
          roll: s.roll,
          cls: label(o),
          last: ps[1] ?? 0,
          skills: (latest?.byDomain ?? [])
            .filter((d) => (percent(d.score, d.max) ?? 100) < 50 && d.domain)
            .map((d) => d.domain)
            .slice(0, 2),
        });
      }
    }
  }
  twice.sort((a, b) => a.last - b.last);

  // Skills, all finished work so far.
  const skills = new Map<string, { score: number; max: number }>();
  for (const o of chosen)
    for (const x of o.tests)
      for (const d of x.summary.domains) {
        if (!d.domain) continue;
        const acc = skills.get(d.domain) ?? { score: 0, max: 0 };
        acc.score += d.score;
        acc.max += d.max;
        skills.set(d.domain, acc);
      }

  const hasTests = sat.length > 0;

  return (
    <>
      <main className="k-main k-main--tabbed">
        <PageHead title={t("tab.insights")} />
        {overview.length === 0 ? (
          <Empty title={t("home.emptyTitle")} body={t("insights.empty")} />
        ) : (
          <>
            <fieldset className="cluster">
              <legend className="sr-only">{t("insights.which")}</legend>
              {overview.map((o, i) => {
                const on = pick === o.cls.id || (pick === "first" && i === 0);
                return (
                  <button
                    key={o.cls.id}
                    type="button"
                    className="ochip"
                    aria-pressed={on}
                    onClick={() => setPick(o.cls.id)}
                  >
                    {o.cls.grade} {o.cls.section}
                  </button>
                );
              })}
              {overview.length > 1 ? (
                <button
                  type="button"
                  className="ochip"
                  aria-pressed={pick === "all"}
                  onClick={() => setPick("all")}
                >
                  {t("insights.all")}
                </button>
              ) : null}
            </fieldset>

            {!hasTests ? <Empty title={t("class.noTests")} body={t("insights.empty")} /> : null}

            {hasTests ? (
              <section className="card" aria-labelledby="sat-h">
                <h2 id="sat-h">{t("insights.sat")}</h2>
                <div className="legend small">
                  <span className="lg lg--ink">{t("entry.present")}</span>
                  <span className="lg lg--genda">{t("entry.absent")}</span>
                  <span className="lg lg--rule">{t("status.none")}</span>
                </div>
                <div className="stack-bars" role="img" aria-label={t("insights.satChart")}>
                  {sat.map((x) => {
                    const n = Math.max(1, x.total);
                    const { present, absent } = x.summary.attendance;
                    const rest = Math.max(0, x.total - present - absent);
                    return (
                      <div key={x.a.id} className="stack-bars__col">
                        <div className="stack-bars__bar">
                          <span className="sb--rule" style={{ flexGrow: rest / n }} />
                          <span className="sb--genda" style={{ flexGrow: absent / n }} />
                          <span className="sb--ink" style={{ flexGrow: present / n }} />
                        </div>
                        <span className="stack-bars__label">
                          {formatShortMonth(locale, x.a.date)}
                          {many ? <small>{x.o.cls.grade + x.o.cls.section}</small> : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="sr-only">
                  <table>
                    <caption>{t("insights.sat")}</caption>
                    <tbody>
                      {sat.map((x) => (
                        <tr key={x.a.id}>
                          <th scope="row">{x.a.title}</th>
                          <td>
                            {t("insights.satRow", {
                              present: x.summary.attendance.present,
                              absent: x.summary.attendance.absent,
                              total: x.total,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {hasTests ? (
              <section className="card" aria-labelledby="tw-h">
                <h2 id="tw-h">{t("insights.twice")}</h2>
                {twice.length === 0 ? (
                  <p className="muted">{t("insights.twiceNone")}</p>
                ) : (
                  <ul className="list">
                    {twice.slice(0, 12).map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="row-link row-link--flat"
                          onClick={() => go(`/student/${s.id}`)}
                        >
                          <span className="roll-dot num">{s.roll.padStart(2, "0")}</span>
                          <span className="row-link__body">
                            <span className="row-link__title">{s.name}</span>
                            <span className="row-link__meta">
                              {many ? `${s.cls} · ` : ""}
                              {s.skills.join(", ") || t("insights.overall")}
                            </span>
                          </span>
                          <span className="num row-link__value">
                            {formatPercent(locale, s.last)}
                          </span>
                          <span className="chev">
                            <Icon name="chev" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {skills.size > 0 ? (
              <section className="card" aria-labelledby="sk-h">
                <h2 id="sk-h">{t("insights.skills")}</h2>
                <Bars
                  caption={t("insights.skills")}
                  data={[...skills.entries()]
                    .map(([k, v]) => ({ k, p: percent(v.score, v.max) }))
                    .sort((a, b) => (b.p ?? 0) - (a.p ?? 0))
                    .map(({ k, p }) => ({
                      key: k,
                      label: k,
                      value: p,
                      text: formatPercent(locale, p),
                    }))}
                />
                <p className="small muted">{t("insights.skillsNote")}</p>
              </section>
            ) : null}
          </>
        )}
      </main>
      <TabBar />
    </>
  );
}
