"use client";
import { type FormEvent, useEffect, useState } from "react";
import { APP_VERSION, PRODUCT_NAME, REPO_URL } from "../../config";
import { formatNumber } from "../../i18n";
import {
  type BackupError,
  type BackupPayload,
  backupFileName,
  decryptBackup,
  encryptBackup,
  MIN_PASSPHRASE,
} from "../../lib/backup";
import { exportTables, importTables, isDemo, wipeAll } from "../../lib/db";
import { type TextSize, type Theme, useApp } from "../context";
import { shareOrSave } from "../files";
import { hasPin, setPin } from "../PinGate";
import { Icon, LanguageSwitch, Sheet, TopBar } from "../ui";

export default function Settings() {
  const { t, theme, setTheme, size, setSize } = useApp();
  return (
    <>
      <TopBar title={t("settings.title")} back="/" />
      <main className="k-main">
        <section className="card" aria-labelledby="look-h">
          <h2 id="look-h">{t("settings.look")}</h2>
          <div className="field">
            <span className="label">{t("settings.language")}</span>
            <LanguageSwitch />
          </div>
          <div className="field">
            <span className="label" id="theme-l">
              {t("settings.theme")}
            </span>
            <fieldset className="seg" aria-labelledby="theme-l">
              {(["light", "dark", "system"] as Theme[]).map((x) => (
                <button
                  key={x}
                  type="button"
                  aria-pressed={theme === x}
                  onClick={() => setTheme(x)}
                >
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
                >
                  {t(`settings.size.${x}`)}
                </button>
              ))}
            </fieldset>
          </div>
        </section>
        <Backup />
        <Restore />
        <PinSettings />
        <Danger />
        <section className="card" aria-labelledby="about-h">
          <h2 id="about-h">{t("settings.about")}</h2>
          <p>{t("settings.aboutBody", { product: PRODUCT_NAME })}</p>
          <div className="cluster">
            <a className="btn btn--sm" href="/#privacy">
              {t("settings.privacy")}
            </a>
            <a className="btn btn--sm" href="/#docs">
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
      </main>
    </>
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
      setPayload(await decryptBackup(text, pass));
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
  const { t, go } = useApp();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const confirmWord = t("danger.word");
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
