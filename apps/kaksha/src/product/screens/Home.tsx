"use client";
import { isDemo } from "../../lib/db";
import { useApp } from "../context";
import { useClasses } from "../data";
import { Empty, Icon, LanguageSwitch, TopBar } from "../ui";

export function Home() {
  const { t, go } = useApp();
  const classes = useClasses();

  return (
    <>
      <TopBar
        sub={t("home.sub")}
        actions={
          <>
            <LanguageSwitch />
            <button
              type="button"
              className="icon-btn"
              onClick={() => go("/settings")}
              aria-label={t("nav.settings")}
            >
              <Icon name="settings" />
            </button>
          </>
        }
      />
      <main className="k-main">
        {classes === undefined ? null : classes.length === 0 ? (
          <Empty title={t("home.emptyTitle")} body={t("home.emptyBody")}>
            <button type="button" className="btn btn--primary" onClick={() => go("/new-class")}>
              <Icon name="plus" />
              {t("home.addClass")}
            </button>
            {!isDemo() ? (
              <a className="btn btn--ghost" href="/app?demo=1">
                {t("home.tryDemo")}
              </a>
            ) : null}
          </Empty>
        ) : (
          <>
            <div className="spread">
              <h1>{t("home.title")}</h1>
              <button type="button" className="btn btn--sm" onClick={() => go("/new-class")}>
                <Icon name="plus" />
                {t("home.addClass")}
              </button>
            </div>
            <ul className="list">
              {classes.map((c) => (
                <li key={c.id}>
                  <button type="button" className="row-link" onClick={() => go(`/class/${c.id}`)}>
                    <span className="who__roll" aria-hidden="true" style={{ fontSize: "1.05rem" }}>
                      {c.grade}
                      {c.section}
                    </span>
                    <span className="row-link__body">
                      <span className="row-link__title">
                        {t("class.label", { grade: c.grade, section: c.section })} · {c.year}
                      </span>
                      <span className="row-link__meta">
                        {c.school?.name} ·{" "}
                        {t("home.counts", { students: c.studentCount, tests: c.testCount })}
                      </span>
                    </span>
                    <span className="chev">
                      <Icon name="chev" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="small muted" style={{ marginTop: "auto" }}>
          {t("home.privacy")}
        </p>
      </main>
    </>
  );
}
