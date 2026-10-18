"use client";
// Today answers one question: what should I do next? Unfinished marking first, then
// results that are ready, then the backup nudge.
import { PRODUCT_NAME } from "../../config";
import { formatPercent, LOCALES } from "../../i18n";
import { isDemo } from "../../lib/db";
import { useApp } from "../context";
import { type ClassOverview, type TestState, useOverview, useProfile, useSetting } from "../data";
import { useInstall, useOnline } from "../install";
import { Icon, Meter, PageHead, SectionHead, TabBar, Tikki } from "../ui";

const DAY = 86_400_000;
const INTERVAL: Record<string, number> = { week: 7, fortnight: 14, month: 30 };

export function lastBackup(): Date | null {
  try {
    const v = localStorage.getItem("kaksha-last-backup");
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}

export function Home() {
  const { t, go, locale } = useApp();
  const overview = useOverview(locale);
  const profile = useProfile();
  const reminder = useSetting<string>("backupReminder");
  const online = useOnline();
  const install = useInstall();
  const demo = isDemo();

  const now = new Date();
  const kicker = new Intl.DateTimeFormat(LOCALES[locale].intl, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const hour = now.getHours();
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const name = profile?.name?.trim().split(/\s+/)[0];
  const greeting = name ? t(`today.greet.${part}.name`, { name }) : t(`today.greet.${part}`);

  const all: Array<TestState & { o: ClassOverview }> = (overview ?? []).flatMap((o) =>
    o.tests.map((x) => ({ ...x, o })),
  );
  const open = all
    .filter((x) => x.done > 0 && x.done < x.total)
    .sort((a, b) => b.lastAt - a.lastAt);
  const ready = all
    .filter((x) => x.total > 0 && x.done === x.total && x.summary.complete.length > 0)
    .sort((a, b) => b.a.date.localeCompare(a.a.date))
    .slice(0, 3);
  const notStarted = all.filter((x) => x.done === 0 && x.total > 0);
  const hasTests = all.length > 0;
  const firstClass = overview?.[0];

  const last = lastBackup();
  const every = INTERVAL[reminder ?? "week"];
  const days = last ? Math.floor((now.getTime() - last.getTime()) / DAY) : null;
  const backupDue = !demo && hasTests && every !== undefined && (days === null || days >= every);

  const cls = (o: ClassOverview) =>
    t("class.label", { grade: o.cls.grade, section: o.cls.section }).trim();

  const cont = open[0];
  const nextChild = cont
    ? cont.o.students.find((s) =>
        cont.summary.results.some(
          (r) => r.studentId === s.id && (r.status === "partial" || r.status === "none"),
        ),
      )
    : undefined;

  return (
    <>
      <main className="k-main k-main--tabbed">
        <PageHead
          kicker={kicker}
          title={greeting}
          actions={
            <span className="k-head__mark">
              <Tikki size={44} />
            </span>
          }
        />
        <p className={`status${online ? "" : " status--off"}`}>
          <span aria-hidden="true" />
          {online ? t("today.saved") : t("today.offline")}
        </p>

        {overview === undefined ? null : overview.length === 0 ? (
          <div className="card card--hero-empty">
            <Tikki size={88} mood="calm" />
            <h2>{t("home.emptyTitle")}</h2>
            <p className="muted">{t("home.emptyBody")}</p>
            <button type="button" className="btn btn--primary" onClick={() => go("/welcome/4")}>
              <Icon name="plus" />
              {t("home.addClass")}
            </button>
            {!demo ? (
              <a className="btn" href="/app?demo=1">
                {t("home.tryDemo")}
              </a>
            ) : null}
          </div>
        ) : null}

        {demo ? (
          <section className="card card--try" aria-labelledby="try-h">
            <span className="k-kicker">{t("today.tryFirst")}</span>
            <h2 id="try-h">{t("today.tryTitle")}</h2>
            <p className="small">{t("today.tryBody")}</p>
          </section>
        ) : null}

        {cont ? (
          <section className="hero" aria-labelledby="cont-h">
            <span className="k-kicker">{t("today.continue")}</span>
            <h2 id="cont-h">{cont.a.title}</h2>
            <p className="hero__meta">
              {cls(cont.o)} ·{" "}
              {cont.a.kind === "key"
                ? t("test.kind.key", { n: cont.a.items.length })
                : t("test.kind.rubric", { n: cont.a.items.length })}
            </p>
            <div className="hero__progress">
              <Meter value={(cont.done / cont.total) * 100} tone="genda" />
              <span className="num">
                {t("today.ofTotal", { done: cont.done, total: cont.total })}
              </span>
            </div>
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => go(`/test/${cont.a.id}/mark`)}
            >
              {nextChild
                ? t("today.continueWith", { name: nextChild.name.split(" ")[0] ?? "" })
                : t("test.continue")}
            </button>
          </section>
        ) : null}

        {overview && overview.length > 0 && !hasTests && firstClass ? (
          <section className="card card--hero-empty" aria-labelledby="first-h">
            <Tikki size={88} />
            <h2 id="first-h">{t("today.noTests", { cls: cls(firstClass) })}</h2>
            <p className="muted">{t("today.noTestsBody")}</p>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => go(`/class/${firstClass.cls.id}/new`)}
            >
              <Icon name="plus" />
              {t("onb.ready.firstTest")}
            </button>
            <button
              type="button"
              className="btn btn--block"
              onClick={() => go(`/class/${firstClass.cls.id}/new`)}
            >
              {t("today.useExample")}
            </button>
          </section>
        ) : null}

        {notStarted.length > 0 && !cont ? (
          <section className="stack" aria-labelledby="todo-h">
            <SectionHead title={t("today.toMark")} />
            <ul className="list list--cards">
              {notStarted.slice(0, 3).map((x) => (
                <li key={x.a.id}>
                  <button
                    type="button"
                    className="row-link"
                    onClick={() => go(`/test/${x.a.id}/mark`)}
                  >
                    <span className="badge">{x.o.cls.grade + x.o.cls.section}</span>
                    <span className="row-link__body">
                      <span className="row-link__title">{x.a.title}</span>
                      <span className="row-link__meta">
                        {cls(x.o)} · {t("test.mark")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icon name="chev" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {ready.length > 0 ? (
          <section className="stack" aria-labelledby="ready-h">
            <SectionHead
              title={t("today.ready")}
              action={
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => go("/classes")}
                >
                  {t("today.seeAll")}
                </button>
              }
            />
            <ul className="list list--cards">
              {ready.map((x) => (
                <li key={x.a.id}>
                  <button type="button" className="row-link" onClick={() => go(`/test/${x.a.id}`)}>
                    <span className="badge">{x.o.cls.grade + x.o.cls.section}</span>
                    <span className="row-link__body">
                      <span className="row-link__title">{x.a.title}</span>
                      <span className="row-link__meta">
                        {cls(x.o)} ·{" "}
                        {t("today.markedOf", { n: x.summary.complete.length, total: x.total })}
                      </span>
                    </span>
                    <span className="num row-link__value">{formatPercent(locale, x.average)}</span>
                    <span className="chev">
                      <Icon name="chev" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {backupDue ? (
          <section className="card card--warn" aria-labelledby="bk-h">
            <h2 id="bk-h">
              <Icon name="shield" />
              {days === null ? t("today.neverBackedUp") : t("today.backupDays", { n: days })}
            </h2>
            <p className="small">{t("today.backupBody")}</p>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={() => go("/more/backup")}
            >
              {t("backup.make")}
            </button>
          </section>
        ) : null}

        {!demo && !install.installed && install.canPrompt && overview && overview.length > 0 ? (
          <section className="card card--ink" aria-labelledby="inst-h">
            <h2 id="inst-h">
              <Icon name="phone" />
              {t("onb.ready.install", { product: PRODUCT_NAME })}
            </h2>
            <p className="small">{t("onb.ready.installBody")}</p>
            <button type="button" className="btn btn--accent btn--sm" onClick={install.prompt}>
              <Icon name="download" />
              {t("onb.ready.installGo")}
            </button>
          </section>
        ) : null}

        {hasTests && !cont ? (
          <div className="tip">
            <span className="k-kicker">{t("today.tip")}</span>
            <p className="small">{t("today.tipBody")}</p>
          </div>
        ) : null}
        <p className="small muted center">{t("home.privacy")}</p>
      </main>
      <TabBar />
    </>
  );
}
