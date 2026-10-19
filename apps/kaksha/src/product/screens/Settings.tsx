"use client";
import { type FormEvent, useEffect, useState } from "react";
import { APP_VERSION, PRODUCT_NAME, REPO_URL, SUPPORT_EMAIL } from "../../config";
import { formatNumber, LOCALES, type Locale } from "../../i18n";
import {
  type BackupError,
  type BackupPayload,
  backupFileName,
  decryptBackup,
  encryptBackup,
  MIN_PASSPHRASE,
} from "../../lib/backup";
import {
  exportTables,
  importTables,
  isDemo,
  type MergePreview,
  previewImport,
  putSetting,
  wipeAll,
} from "../../lib/db";
import { type TextSize, type Theme, useApp } from "../context";
import { useOverview, useProfile } from "../data";
import { shareOrSave } from "../files";
import { hasPin, setPin } from "../PinGate";
import { ChoiceRow, Icon, type IconName, PageHead, Sheet, TopBar } from "../ui";
import { lastBackup } from "./Home";

const PAGES = ["backup", "pin", "display", "data", "profile", "problem"] as const;
type Page = (typeof PAGES)[number];

export default function Settings({ page }: { page?: string | undefined }) {
  const { t } = useApp();
  const p = (PAGES as readonly string[]).includes(page ?? "") ? (page as Page) : null;
  if (!p) return <MoreHub />;
  const title = {
    backup: t("more.backup"),
    pin: t("pin.settingsTitle"),
    display: t("settings.look"),
    data: t("more.data"),
    profile: t("more.profile"),
    problem: t("problem.title"),
  }[p];
  return (
    <>
      <TopBar title={title} back="/more" />
      <main className="k-main">
        {p === "backup" ? (
          <>
            <Backup />
            <Restore />
          </>
        ) : null}
        {p === "pin" ? <PinSettings /> : null}
        {p === "display" ? <Display /> : null}
        {p === "profile" ? <ProfileForm /> : null}
        {p === "problem" ? <Problem /> : null}
        {p === "data" ? (
          <>
            <About />
            <Danger />
          </>
        ) : null}
      </main>
    </>
  );
}

function MoreHub() {
  const { t, go, locale, size } = useApp();
  const profile = useProfile();
  const overview = useOverview(locale);
  const [pinOn, setPinOn] = useState<boolean | null>(null);
  useEffect(() => {
    hasPin().then(setPinOn);
  }, []);
  const classes = overview?.length ?? 0;
  const students = overview?.reduce((n, o) => n + o.students.length, 0) ?? 0;
  const tests = overview?.reduce((n, o) => n + o.tests.length, 0) ?? 0;
  const school = overview?.[0]?.school?.name;
  const last = lastBackup();
  const days = last ? Math.floor((Date.now() - last.getTime()) / 86_400_000) : null;
  const name = profile?.name?.trim();
  const initials = name
    ? name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : null;

  const rows: Array<{
    key: string;
    icon: IconName;
    title: string;
    sub: string;
    href?: string;
    to?: string;
  }> = [
    {
      key: "backup",
      icon: "shield",
      title: t("more.backup"),
      sub: t("more.backupSub"),
      to: "/more/backup",
    },
    {
      key: "pin",
      icon: "lock",
      title: t("pin.settingsTitle"),
      sub: pinOn ? t("onb.on") : t("onb.off"),
      to: "/more/pin",
    },
    {
      key: "display",
      icon: "text",
      title: t("more.languageText"),
      sub: `${LOCALES[locale].label} · ${t(`settings.size.${size}`)}`,
      to: "/more/display",
    },
    {
      key: "templates",
      icon: "file",
      title: t("more.templates"),
      sub: t("more.templatesSub"),
      href: "/docs/templates",
    },
    { key: "help", icon: "help", title: t("settings.help"), sub: t("more.helpSub"), href: "/docs" },
    {
      key: "problem",
      icon: "lifebuoy",
      title: t("problem.title"),
      sub: t("problem.sub"),
      to: "/more/problem",
    },
    {
      key: "privacy",
      icon: "lock",
      title: t("settings.privacy"),
      sub: t("more.privacySub"),
      href: "/docs/privacy",
    },
    { key: "data", icon: "trash", title: t("more.data"), sub: t("more.dataSub"), to: "/more/data" },
  ];

  return (
    <main className="k-main k-main--tabbed">
      <PageHead title={t("tab.more")} />
      <button type="button" className="profile card" onClick={() => go("/more/profile")}>
        <span className="profile__avatar" aria-hidden="true">
          {initials ?? <Icon name="user" />}
        </span>
        <span className="row-link__body">
          <span className="row-link__title">{name || t("more.addName")}</span>
          <span className="row-link__meta">{school ?? t("more.profileSub")}</span>
        </span>
        <span className="chev">
          <Icon name="chev" />
        </span>
      </button>
      <section className="card card--ink phonecard" aria-labelledby="phone-h">
        <h2 id="phone-h" className="k-kicker">
          {t("more.onPhone")}
        </h2>
        <p>
          {t("more.counts", { classes, students, tests })}
          {" · "}
          {days === null ? t("today.neverBackedUp") : t("more.lastBackup", { n: days })}
        </p>
      </section>
      <ul className="list card card--flush">
        {rows.map((r) => (
          <li key={r.key}>
            {r.href ? (
              <a className="row-link row-link--flat" href={r.href}>
                <span className="icon-tile">
                  <Icon name={r.icon} />
                </span>
                <span className="row-link__body">
                  <span className="row-link__title">{r.title}</span>
                  <span className="row-link__meta">{r.sub}</span>
                </span>
                <span className="chev">
                  <Icon name="chev" />
                </span>
              </a>
            ) : (
              <button
                type="button"
                className="row-link row-link--flat"
                onClick={() => r.to && go(r.to)}
              >
                <span className="icon-tile">
                  <Icon name={r.icon} />
                </span>
                <span className="row-link__body">
                  <span className="row-link__title">{r.title}</span>
                  <span className="row-link__meta">{r.sub}</span>
                </span>
                <span className="chev">
                  <Icon name="chev" />
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="small muted center num">
        {PRODUCT_NAME} {APP_VERSION}
      </p>
    </main>
  );
}

function Display() {
  const { t, theme, setTheme, size, setSize, locale, setLocale } = useApp();
  return (
    <section className="card" aria-labelledby="look-h">
      <h2 id="look-h">{t("settings.look")}</h2>
      <div className="stack" style={{ gap: 10 }}>
        {(Object.keys(LOCALES) as Locale[]).map((l) => (
          <ChoiceRow
            key={l}
            lang={LOCALES[l].intl.split("-")[0]}
            selected={locale === l}
            onClick={() => setLocale(l)}
            title={LOCALES[l].label}
            sub={l === "hi" ? "Hindi" : "अंग्रेज़ी"}
          />
        ))}
      </div>
      <div className="field">
        <span className="label" id="theme-l">
          {t("settings.theme")}
        </span>
        <fieldset className="seg" aria-labelledby="theme-l">
          {(["light", "dark", "system"] as Theme[]).map((x) => (
            <button key={x} type="button" aria-pressed={theme === x} onClick={() => setTheme(x)}>
              {t(`settings.theme.${x}`)}
            </button>
          ))}
        </fieldset>
      </div>
      <div className="field">
        <span className="label" id="size-l">
          {t("settings.size")}
        </span>
        <fieldset className="seg" aria-labelledby="size-l">
          {(["s", "m", "l", "xl"] as TextSize[]).map((x, i) => (
            <button
              key={x}
              type="button"
              aria-pressed={size === x}
              onClick={() => setSize(x)}
              style={{ fontSize: `${0.85 + i * 0.12}rem` }}
              aria-label={t(`settings.size.${x}`)}
            >
              A
            </button>
          ))}
        </fieldset>
      </div>
      <div className="sample">
        <span className="k-kicker">{t("more.sample")}</span>
        <p>{t("more.sampleText")}</p>
      </div>
    </section>
  );
}

function ProfileForm() {
  const { t, go } = useApp();
  const profile = useProfile();
  const [name, setName] = useState<string | null>(null);
  if (profile === undefined) return null;
  const value = name ?? profile?.name ?? "";
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        await putSetting("profile", {
          name: value.trim(),
          board: profile?.board ?? "",
          medium: profile?.medium ?? "",
        });
        go("/more");
      }}
    >
      <p className="muted">{t("onb.about.body")}</p>
      <div className="field">
        <label htmlFor="pf-name">{t("onb.about.name")}</label>
        <input
          id="pf-name"
          className="input"
          autoComplete="name"
          value={value}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn--primary">
        {t("common.save")}
      </button>
    </form>
  );
}

/** Escalation: what to send, where to send it, and never any children's data. */
function Problem() {
  const { t } = useApp();
  const [copied, setCopied] = useState(false);
  const info = `${PRODUCT_NAME} ${APP_VERSION} · ${typeof navigator === "undefined" ? "" : navigator.userAgent}`;
  const body = `${t("problem.template")}\n\n---\n${info}`;
  const href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME}: problem`)}&body=${encodeURIComponent(body)}`;
  return (
    <section className="card stack" aria-labelledby="problem-h">
      <h2 id="problem-h">{t("problem.heading")}</h2>
      <p>{t("problem.body")}</p>
      <p className="notice notice--warn">{t("problem.noNames")}</p>
      <div className="field">
        <span className="small muted">{t("problem.info")}</span>
        <code className="problem__info num">{info}</code>
        <button
          type="button"
          className="btn btn--sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(info);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Icon name="copy" />
          {copied ? t("problem.copied") : t("problem.copy")}
        </button>
      </div>
      <div className="cluster">
        <a className="btn btn--primary" href={href}>
          <Icon name="lifebuoy" />
          {t("problem.open")}
        </a>
        <a className="btn" href="/docs/faq">
          <Icon name="help" />
          {t("problem.faq")}
        </a>
      </div>
      <p className="small muted">{t("problem.offline")}</p>
    </section>
  );
}

function About() {
  const { t } = useApp();
  return (
    <section className="card" aria-labelledby="about-h">
      <h2 id="about-h">{t("settings.about")}</h2>
      <p>{t("settings.aboutBody", { product: PRODUCT_NAME })}</p>
      <div className="cluster">
        <a className="btn btn--sm" href="/docs/privacy">
          {t("settings.privacy")}
        </a>
        <a className="btn btn--sm" href="/docs">
          {t("settings.help")}
        </a>
        <a className="btn btn--sm" href={REPO_URL} rel="noopener">
          {t("settings.source")}
        </a>
      </div>
      <p className="small muted num">
        {PRODUCT_NAME} {APP_VERSION}
      </p>
    </section>
  );
}

function Backup() {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (p1.length < MIN_PASSPHRASE)
      return setMsg({ kind: "bad", text: t("backup.tooShort", { n: MIN_PASSPHRASE }) });
    if (p1 !== p2) return setMsg({ kind: "bad", text: t("backup.mismatch") });
    setBusy(true);
    setMsg(null);
    try {
      const env = await encryptBackup(await exportTables(), p1);
      const how = await shareOrSave(backupFileName(), JSON.stringify(env), "text/plain");
      if (how !== "cancelled") {
        localStorage.setItem("kaksha-last-backup", new Date().toISOString());
        setMsg({ kind: "ok", text: how === "shared" ? t("backup.shared") : t("backup.saved") });
        setP1("");
        setP2("");
      }
    } catch {
      setMsg({ kind: "bad", text: t("backup.failed") });
    } finally {
      setBusy(false);
    }
  };

  let last: string | null = null;
  try {
    last = localStorage.getItem("kaksha-last-backup");
  } catch {}

  return (
    <section className="card" aria-labelledby="backup-h">
      <h2 id="backup-h">{t("backup.title")}</h2>
      <p className="muted">{t("backup.body")}</p>
      {last ? (
        <p className="small muted">
          {t("backup.last", { date: new Date(last).toLocaleDateString("en-GB") })}
        </p>
      ) : null}
      <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
        <Icon name="share" />
        {t("backup.make")}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("backup.make")}>
        <form className="stack" onSubmit={submit}>
          <p>{t("backup.passphraseIntro")}</p>
          <div className="field">
            <label htmlFor="bp1">{t("backup.passphrase")}</label>
            <input
              id="bp1"
              className="input"
              type="password"
              autoComplete="new-password"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="bp2">{t("backup.again")}</label>
            <input
              id="bp2"
              className="input"
              type="password"
              autoComplete="new-password"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
            />
          </div>
          <p className="notice notice--warn small">{t("backup.warn")}</p>
          {msg ? (
            <p
              className={`notice notice--${msg.kind}`}
              role={msg.kind === "bad" ? "alert" : "status"}
            >
              {msg.text}
            </p>
          ) : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? t("backup.working") : t("backup.go")}
          </button>
        </form>
      </Sheet>
    </section>
  );
}

function Restore() {
  const { t, locale } = useApp();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [pass, setPass] = useState("");
  const [payload, setPayload] = useState<BackupPayload | null>(null);
  const [preview, setPreview] = useState<MergePreview[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  const reset = () => {
    setText(null);
    setFileName("");
    setPass("");
    setPayload(null);
    setMsg(null);
  };

  const unlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!text) return;
    setBusy(true);
    setMsg(null);
    try {
      const p = await decryptBackup(text, pass);
      setPreview(await previewImport(p.tables));
      setPayload(p);
    } catch (err) {
      const code = (err as BackupError).code ?? "damaged";
      setMsg({
        kind: "bad",
        text: t(`restore.error.${code === "short-passphrase" ? "wrong-passphrase" : code}`),
      });
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!payload) return;
    setBusy(true);
    try {
      const r = await importTables(payload.tables);
      setMsg({ kind: "ok", text: t("restore.done", { added: r.added, updated: r.updated }) });
      setPayload(null);
      setText(null);
    } catch {
      setMsg({ kind: "bad", text: t("restore.error.damaged") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="restore-h">
      <h2 id="restore-h">{t("restore.title")}</h2>
      <p className="muted">{t("restore.body")}</p>
      <button
        type="button"
        className="btn"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Icon name="upload" />
        {t("restore.open")}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("restore.title")}>
        <div className="stack">
          <label className="btn">
            <Icon name="upload" />
            {fileName || t("restore.choose")}
            <input
              type="file"
              className="sr-only"
              accept=".txt,.kaksha,text/plain,application/json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setFileName(f.name);
                setPayload(null);
                setMsg(null);
                setText(await f.text());
              }}
            />
          </label>
          {text && !payload ? (
            <form className="stack" onSubmit={unlock}>
              <div className="field">
                <label htmlFor="rp">{t("restore.passphrase")}</label>
                <input
                  id="rp"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn--primary" disabled={busy || !pass}>
                {busy ? t("backup.working") : t("restore.unlock")}
              </button>
            </form>
          ) : null}
          {payload ? (
            <div className="stack">
              <p className="notice">
                {t("restore.contains", {
                  classes: formatNumber(locale, payload.tables.classes.length),
                  students: formatNumber(locale, payload.tables.students.length),
                  tests: formatNumber(locale, payload.tables.assessments.length),
                  date: new Date(payload.exportedAt).toLocaleDateString("en-GB"),
                })}
              </p>
              {preview?.length ? (
                <>
                  <p>
                    <strong>{t("restore.willDo")}</strong>
                  </p>
                  <ul className="list card card--flush">
                    {preview.map((c) => (
                      <li key={c.classId} className="row-link row-link--flat">
                        <span className="badge">{c.grade + c.section}</span>
                        <span className="row-link__body">
                          <span className="row-link__title">
                            {t("class.label", { grade: c.grade, section: c.section })}
                          </span>
                          <span className="row-link__meta">
                            {t(`restore.state.${c.state}`, { n: c.changes, students: c.students })}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <p className="small muted">{t("restore.mergeNote")}</p>
              <button type="button" className="btn btn--primary" onClick={apply} disabled={busy}>
                {t("restore.apply")}
              </button>
            </div>
          ) : null}
          {msg ? (
            <p
              className={`notice notice--${msg.kind}`}
              role={msg.kind === "bad" ? "alert" : "status"}
            >
              {msg.text}
            </p>
          ) : null}
        </div>
      </Sheet>
    </section>
  );
}

function PinSettings() {
  const { t } = useApp();
  const [on, setOn] = useState<boolean | null>(null);
  const [pin, setPinValue] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    hasPin().then(setOn);
  }, []);
  return (
    <section className="card" aria-labelledby="pin-h">
      <h2 id="pin-h">{t("pin.settingsTitle")}</h2>
      <p className="muted">{t("pin.settingsBody")}</p>
      <form
        className="cluster"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!/^\d{4,8}$/.test(pin)) return setMsg(t("pin.rule"));
          await setPin(pin);
          setPinValue("");
          setOn(true);
          setMsg(t("pin.set"));
        }}
      >
        <label className="sr-only" htmlFor="newpin">
          {t("pin.new")}
        </label>
        <input
          id="newpin"
          className="input num"
          style={{ maxWidth: 180 }}
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          placeholder={t("pin.new")}
          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
        />
        <button type="submit" className="btn btn--sm">
          {on ? t("pin.change") : t("pin.turnOn")}
        </button>
        {on ? (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={async () => {
              await setPin(null);
              setOn(false);
              setMsg(t("pin.off"));
            }}
          >
            {t("pin.turnOff")}
          </button>
        ) : null}
      </form>
      {msg ? (
        <p className="small" role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}

function Danger() {
  const { t, go, locale } = useApp();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const overview = useOverview(locale);
  const confirmWord = t("danger.word");
  const counts = {
    classes: overview?.length ?? 0,
    students: overview?.reduce((n, o) => n + o.students.length, 0) ?? 0,
    tests: overview?.reduce((n, o) => n + o.tests.length, 0) ?? 0,
  };
  const days = (() => {
    const last = lastBackup();
    return last ? Math.floor((Date.now() - last.getTime()) / 86_400_000) : null;
  })();
  return (
    <section className="card" aria-labelledby="danger-h">
      <h2 id="danger-h">{isDemo() ? t("danger.demoTitle") : t("danger.title")}</h2>
      <p className="muted">{t("danger.body")}</p>
      <button type="button" className="btn btn--danger" onClick={() => setOpen(true)}>
        {t("danger.button")}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("danger.button")}>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (word.trim().toLowerCase() !== confirmWord.toLowerCase()) return;
            await wipeAll();
            setOpen(false);
            go("/", true);
          }}
        >
          <p>{t("danger.exact", counts)}</p>
          <p className="small muted">
            {days === null ? t("danger.noBackup") : t("danger.backupAge", { n: days })}
          </p>
          <p>{t("danger.confirm", { word: confirmWord })}</p>
          <input
            className="input"
            aria-label={t("danger.typeHere")}
            value={word}
            onChange={(e) => setWord(e.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn btn--danger"
            disabled={word.trim().toLowerCase() !== confirmWord.toLowerCase()}
          >
            {t("danger.button")}
          </button>
        </form>
      </Sheet>
    </section>
  );
}
