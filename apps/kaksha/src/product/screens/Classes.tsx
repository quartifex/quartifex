"use client";
import { formatPercent } from "../../i18n";
import { useApp } from "../context";
import { useOverview } from "../data";
import { Empty, Icon, PageHead, TabBar } from "../ui";

export default function Classes() {
  const { t, go, locale } = useApp();
  const overview = useOverview(locale);
  return (
    <>
      <main className="k-main k-main--tabbed">
        <PageHead
          title={t("home.title")}
          actions={
            <button type="button" className="btn btn--sm" onClick={() => go("/new-class")}>
              <Icon name="plus" />
              {t("classes.add")}
            </button>
          }
        />
        {overview && overview.length === 0 ? (
          <Empty title={t("home.emptyTitle")} body={t("home.emptyBody")}>
            <button type="button" className="btn btn--primary" onClick={() => go("/new-class")}>
              <Icon name="plus" />
              {t("home.addClass")}
            </button>
          </Empty>
        ) : null}
        <ul className="list list--gap">
          {(overview ?? []).map((o) => {
            const latest = o.tests.find((x) => x.average !== null);
            const recent = o.tests[0];
            const label = t("class.label", { grade: o.cls.grade, section: o.cls.section }).trim();
            const active = o.students.filter((s) => s.active).length;
            const trend = o.tests
              .filter((x) => x.average !== null)
              .slice(0, 5)
              .reverse()
              .map((x) => x.average ?? 0);
            return (
              <li key={o.cls.id} className="ccard">
                <button
                  type="button"
                  className="ccard__main"
                  onClick={() => go(`/class/${o.cls.id}`)}
                >
                  <span className="badge badge--lg">{o.cls.grade + o.cls.section}</span>
                  <span className="row-link__body">
                    <span className="row-link__title">{label}</span>
                    <span className="row-link__meta">
                      {o.school?.name} · {t("class.studentCount", { n: active })}
                    </span>
                  </span>
                  {latest ? (
                    <span className="ccard__avg">
                      <strong className="num">{formatPercent(locale, latest.average)}</strong>
                      <span>{t("classes.average")}</span>
                    </span>
                  ) : null}
                </button>
                <div className="ccard__foot">
                  {recent ? (
                    <>
                      <span className="small muted">
                        {recent.a.title} ·{" "}
                        {recent.done === recent.total
                          ? t("test.finished")
                          : t("test.progress", { done: recent.done, total: recent.total })}
                      </span>
                      {trend.length > 1 ? <Spark values={trend} /> : null}
                    </>
                  ) : (
                    <>
                      <span className="small muted">{t("class.noTests")}</span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => go(`/class/${o.cls.id}/new`)}
                      >
                        <Icon name="plus" />
                        {t("classes.makeTest")}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
      <TabBar />
    </>
  );
}

/** A tiny line of the class average across recent tests. Decorative; the number is beside it. */
export function Spark({ values }: { values: number[] }) {
  const w = 64;
  const h = 18;
  const step = w / Math.max(1, values.length - 1);
  const d = values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${(i * step).toFixed(1)} ${(h - 2 - (v / 100) * (h - 4)).toFixed(1)}`,
    )
    .join("");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--genda)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
