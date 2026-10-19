"use client";
// Today: a dashboard that answers "what should I do next?" first (continue marking),
// then shows where the classes stand (numbers, attendance, the latest test, who needs a
// look, the month's tests), then the housekeeping (backup, install).
import { PRODUCT_NAME } from "../../config";
import { formatPercent, formatShortMonth, LOCALES } from "../../i18n";
import { isDemo } from "../../lib/db";
import { percent } from "../../lib/scoring";
import { Donut, GroupBars, MonthCalendar } from "../charts";
import { useApp } from "../context";
import { type ClassOverview, type TestState, useOverview, useProfile, useSetting } from "../data";
import { useInstall, useOnline } from "../install";
import { Icon, type IconName, Mark, Meter } from "../ui";

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

type Row = TestState & { o: ClassOverview };

export function Home() {
  const { t, go, locale } = useApp();
  const overview = useOverview(locale);
  const profile = useProfile();
  const reminder = useSetting<string>("backupReminder");
  const online = useOnline();
  const install = useInstall();
  const demo = isDemo();
  const intl = LOCALES[locale].intl;

  const now = new Date();
  const kicker = new Intl.DateTimeFormat(intl, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const hour = now.getHours();
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const name = profile?.name?.trim().split(/\s+/)[0];
  const greeting = name ? t(`today.greet.${part}.name`, { name }) : t(`today.greet.${part}`);

  const all: Row[] = (overview ?? []).flatMap((o) => o.tests.map((x) => ({ ...x, o })));
  const open = all
    .filter((x) => x.done > 0 && x.done < x.total)
    .sort((a, b) => b.lastAt - a.lastAt);
  const finished = all
    .filter((x) => x.total > 0 && x.done === x.total && x.summary.complete.length > 0)
    .sort((a, b) => b.a.date.localeCompare(a.a.date));
  const notStarted = all.filter((x) => x.done === 0 && x.total > 0);
  const hasTests = all.length > 0;
  const firstClass = overview?.[0];

  const last = lastBackup();
  const every = INTERVAL[reminder ?? "week"];
  const days = last ? Math.floor((now.getTime() - last.getTime()) / DAY) : null;
  const backupDue = !demo && hasTests && every !== undefined && (days === null || days >= every);

  const cls = (o: ClassOverview) =>
    t("class.label", { grade: o.cls.grade, section: o.cls.section }).trim();
  const cont = open[0] ?? notStarted[0];
  const nextChild = cont
    ? cont.o.students.find((s) =>
        cont.summary.results.some(
          (r) => r.studentId === s.id && (r.status === "partial" || r.status === "none"),
        ),
      )
    : undefined;

  // Numbers for the tiles.
  const students = (overview ?? []).reduce(
    (n, o) => n + o.students.filter((s) => s.active).length,
    0,
  );
  const latestPerClass = (overview ?? [])
    .map((o) => o.tests.find((x) => x.average !== null))
    .filter((x): x is TestState => Boolean(x));
  const avg = latestPerClass.length
    ? latestPerClass.reduce((n, x) => n + (x.average ?? 0), 0) / latestPerClass.length
    : null;
  const prevPerClass = (overview ?? [])
    .map((o) => o.tests.filter((x) => x.average !== null)[1])
    .filter((x): x is TestState => Boolean(x));
  const prevAvg = prevPerClass.length
    ? prevPerClass.reduce((n, x) => n + (x.average ?? 0), 0) / prevPerClass.length
    : null;
  const att = all.reduce(
    (a, x) => ({
      present: a.present + x.summary.attendance.present,
      absent: a.absent + x.summary.attendance.absent,
    }),
    { present: 0, absent: 0 },
  );
  const attRate = percent(att.present, att.present + att.absent);

  // Attendance by test, oldest first.
  const recent = [...all]
    .filter((x) => x.summary.attendance.present + x.summary.attendance.absent > 0)
    .sort((a, b) => a.a.date.localeCompare(b.a.date))
    .slice(-6);

  // The latest finished test, in three bands.
  const latest = finished[0];
  const bands = latest
    ? latest.summary.complete.reduce(
        (b, r) => {
          const p = percent(r.score, r.max) ?? 0;
          if (p >= 75) b.high += 1;
          else if (p >= 50) b.mid += 1;
          else b.low += 1;
          return b;
        },
        { high: 0, mid: 0, low: 0 },
      )
    : null;

  // Children below half in their last two finished tests.
  const watch: Array<{ id: string; roll: string; name: string; cls: string; p: number }> = [];
  for (const o of overview ?? []) {
    const ordered = [...o.tests].sort((a, b) => a.a.date.localeCompare(b.a.date));
    for (const s of o.students) {
      if (!s.active) continue;
      const done = ordered
        .map((x) => x.summary.complete.find((r) => r.studentId === s.id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .slice(-2)
        .map((r) => percent(r.score, r.max) ?? 100);
      if (done.length === 2 && done.every((p) => p < 50))
        watch.push({ id: s.id, roll: s.roll, name: s.name, cls: cls(o), p: done[1] ?? 0 });
    }
  }
  watch.sort((a, b) => a.p - b.p);

  // This month's tests on a calendar; if none this month, the month of the latest test.
  const monthTests = all.filter((x) => {
    const d = new Date(`${x.a.date}T12:00:00`);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const showMonth = monthTests.length ? now : latest ? new Date(`${latest.a.date}T12:00:00`) : now;
  const marks = new Map<number, string>();
  for (const x of all) {
    const d = new Date(`${x.a.date}T12:00:00`);
    if (d.getFullYear() === showMonth.getFullYear() && d.getMonth() === showMonth.getMonth())
      marks.set(d.getDate(), `${x.a.title} · ${cls(x.o)}`);
  }
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intl, { weekday: "short" }).format(new Date(2024, 0, 1 + i)),
  );
  const monthTitle = new Intl.DateTimeFormat(intl, { month: "long", year: "numeric" }).format(
    showMonth,
  );
  const isThisMonth =
    showMonth.getFullYear() === now.getFullYear() && showMonth.getMonth() === now.getMonth();

  const tiles: Array<{
    icon: IconName;
    value: string;
    label: string;
    note?: string;
    tone?: string | undefined;
  }> = [
    {
      icon: "users",
      value: String(students),
      label: t("dash.students"),
      note: t("dash.inClasses", { n: overview?.length ?? 0 }),
    },
    {
      icon: "clipboard",
      value: `${finished.length}/${all.length}`,
      label: t("dash.tests"),
      note: open.length ? t("dash.open", { n: open.length }) : t("dash.allMarked"),
    },
    {
      icon: avg !== null && prevAvg !== null && avg < prevAvg ? "downTrend" : "up",
      value: formatPercent(locale, avg === null ? null : Math.round(avg * 10) / 10),
      label: t("dash.average"),
      note:
        avg !== null && prevAvg !== null
          ? t(avg >= prevAvg ? "dash.upBy" : "dash.downBy", {
              n: Math.abs(Math.round(avg - prevAvg)),
            })
          : t("dash.latestTests"),
      tone: avg !== null && avg < 50 ? "low" : undefined,
    },
    {
      icon: "userCheck",
      value: formatPercent(locale, attRate),
      label: t("dash.attendance"),
      note: t("dash.absentCount", { n: att.absent }),
    },
  ];

  return (
    <main className="k-main k-main--tabbed dash">
      <header className="dash__head">
        <div>
          <span className="k-kicker">{kicker}</span>
          <h1>{greeting}</h1>
        </div>
        <p className={`status${online ? "" : " status--off"}`}>
          <span aria-hidden="true" />
          {online ? t("today.saved") : t("today.offline")}
        </p>
      </header>

      {overview === undefined ? null : overview.length === 0 ? (
        <section className="card card--hero-empty dash__full">
          <Mark size={72} />
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
        </section>
      ) : null}

      {overview && overview.length > 0 ? (
        <section className="tiles dash__full" aria-label={t("dash.glance")}>
          {tiles.map((x) => (
            <div key={x.label} className="tile" data-tone={x.tone}>
              <span className="tile__icon">
                <Icon name={x.icon} />
              </span>
              <span className="tile__value num">{x.value}</span>
              <span className="tile__label">{x.label}</span>
              {x.note ? <span className="tile__note">{x.note}</span> : null}
            </div>
          ))}
        </section>
      ) : null}

      {demo ? (
        <section className="card card--try dash__a" aria-labelledby="try-h">
          <span className="k-kicker">{t("today.tryFirst")}</span>
          <h2 id="try-h">{t("today.tryTitle")}</h2>
          <p className="small">{t("today.tryBody")}</p>
        </section>
      ) : null}

      {cont ? (
        <section className="hero dash__a" aria-labelledby="cont-h">
          <span className="k-kicker">{open[0] ? t("today.continue") : t("today.toMark")}</span>
          <h2 id="cont-h">{cont.a.title}</h2>
          <p className="hero__meta">
            {cls(cont.o)} ·{" "}
            {cont.a.kind === "key"
              ? t("test.kind.key", { n: cont.a.items.length })
              : t("test.kind.rubric", { n: cont.a.items.length })}
          </p>
          <div className="hero__progress">
            <Meter value={(cont.done / Math.max(1, cont.total)) * 100} tone="on-ink" />
            <span className="num">
              {t("today.ofTotal", { done: cont.done, total: cont.total })}
            </span>
          </div>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => go(`/test/${cont.a.id}/mark`)}
          >
            {nextChild && open[0]
              ? t("today.continueWith", { name: nextChild.name.split(" ")[0] ?? "" })
              : open[0]
                ? t("test.continue")
                : t("test.mark")}
            <Icon name="next" />
          </button>
        </section>
      ) : null}

      {overview && overview.length > 0 && !hasTests && firstClass ? (
        <section className="card card--hero-empty dash__a" aria-labelledby="first-h">
          <Mark size={72} />
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
          <div className="tip">
            <span className="k-kicker">{t("today.tip")}</span>
            <p className="small">{t("today.tipBody")}</p>
          </div>
        </section>
      ) : null}

      {recent.length ? (
        <section className="card dash__b" aria-labelledby="att-h">
          <div className="card__head">
            <h2 id="att-h">{t("dash.attendanceTitle")}</h2>
            <span className="pill">{t("dash.lastTests", { n: recent.length })}</span>
          </div>
          <GroupBars
            caption={t("dash.attendanceTitle")}
            labels={[t("entry.present"), t("entry.absent")]}
            data={recent.map((x) => ({
              key: x.a.id,
              label: formatShortMonth(locale, x.a.date),
              a: x.summary.attendance.present,
              b: x.summary.attendance.absent,
              title: `${x.a.title} (${cls(x.o)}): ${t("insights.satRow", {
                present: x.summary.attendance.present,
                absent: x.summary.attendance.absent,
                total: x.total,
              })}`,
            }))}
          />
        </section>
      ) : null}

      {latest && bands ? (
        <section className="card dash__c" aria-labelledby="latest-h">
          <div className="card__head">
            <h2 id="latest-h">{t("dash.latest")}</h2>
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              aria-label={t("test.results")}
              onClick={() => go(`/test/${latest.a.id}`)}
            >
              <Icon name="chev" />
            </button>
          </div>
          <p className="small muted">
            {latest.a.title} · {cls(latest.o)}
          </p>
          <Donut
            caption={t("dash.latest")}
            center={formatPercent(
              locale,
              latest.average === null ? null : Math.round(latest.average),
            )}
            sub={t("dash.avgShort")}
            parts={[
              { key: "high", label: t("dash.band.high"), value: bands.high, tone: "brand" },
              { key: "mid", label: t("dash.band.mid"), value: bands.mid, tone: "soft" },
              { key: "low", label: t("dash.band.low"), value: bands.low, tone: "low" },
            ]}
          />
        </section>
      ) : null}

      {finished.length ? (
        <section className="card dash__a" aria-labelledby="ready-h">
          <div className="card__head">
            <h2 id="ready-h">{t("today.ready")}</h2>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => go("/classes")}>
              {t("today.seeAll")}
            </button>
          </div>
          <ul className="list list--rows">
            {finished.slice(0, 4).map((x) => (
              <li key={x.a.id}>
                <button
                  type="button"
                  className="row-link row-link--flat"
                  onClick={() => go(`/test/${x.a.id}`)}
                >
                  <span className="badge">{x.o.cls.grade + x.o.cls.section}</span>
                  <span className="row-link__body">
                    <span className="row-link__title">{x.a.title}</span>
                    <span className="row-link__meta">
                      {t("today.markedOf", { n: x.summary.complete.length, total: x.total })}
                    </span>
                  </span>
                  <span className="num row-link__value" data-low={(x.average ?? 100) < 50}>
                    {formatPercent(locale, x.average === null ? null : Math.round(x.average))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasTests ? (
        <section className="card dash__b" aria-labelledby="watch-h">
          <div className="card__head">
            <h2 id="watch-h">{t("insights.twice")}</h2>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => go("/insights")}
            >
              {t("today.seeAll")}
            </button>
          </div>
          {watch.length === 0 ? (
            <p className="muted">{t("insights.twiceNone")}</p>
          ) : (
            <div className="tablewrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th scope="col">{t("report.roll")}</th>
                    <th scope="col">{t("report.student")}</th>
                    <th scope="col">{t("report.class")}</th>
                    <th scope="col" className="r">
                      {t("dash.latestShort")}
                    </th>
                    <th scope="col">
                      <span className="sr-only">{t("dash.openCol")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {watch.slice(0, 5).map((w) => (
                    <tr key={w.id}>
                      <td className="num">{w.roll}</td>
                      <td>{w.name}</td>
                      <td className="muted">{w.cls}</td>
                      <td className="r num">
                        <span className="pill pill--genda">{formatPercent(locale, w.p)}</span>
                      </td>
                      <td className="r">
                        <button
                          type="button"
                          className="icon-btn icon-btn--sm icon-btn--soft"
                          aria-label={t("dash.openChild", { name: w.name })}
                          onClick={() => go(`/student/${w.id}`)}
                        >
                          <Icon name="chev" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {hasTests ? (
        <section className="card dash__c" aria-labelledby="cal-h">
          <div className="card__head">
            <h2 id="cal-h">{t("dash.calendar")}</h2>
            <Icon name="calendar" />
          </div>
          <MonthCalendar
            year={showMonth.getFullYear()}
            month={showMonth.getMonth()}
            marks={marks}
            weekdays={weekdays}
            title={monthTitle}
            today={isThisMonth ? now.getDate() : null}
          />
        </section>
      ) : null}

      {backupDue ? (
        <section className="card card--warn dash__full" aria-labelledby="bk-h">
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
        <section className="card card--ink dash__full" aria-labelledby="inst-h">
          <h2 id="inst-h">
            <Icon name="install" />
            {t("onb.ready.install", { product: PRODUCT_NAME })}
          </h2>
          <p className="small">{t("onb.ready.installBody")}</p>
          <button type="button" className="btn btn--accent btn--sm" onClick={install.prompt}>
            <Icon name="download" />
            {t("onb.ready.installGo")}
          </button>
        </section>
      ) : null}

      <p className="small muted center dash__full">{t("home.privacy")}</p>
    </main>
  );
}
