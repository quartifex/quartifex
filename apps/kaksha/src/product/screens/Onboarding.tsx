"use client";
// First open: language, three short promises, then four steps to a ready class.
// Every step except the class itself can be skipped. Nothing asks for an account.
import { type KeyboardEvent, useRef, useState } from "react";
import { PRODUCT_NAME } from "../../config";
import { LOCALES, type Locale } from "../../i18n";
import { parseRoster } from "../../lib/csv";
import { db, putSetting } from "../../lib/db";
import { newId } from "../../lib/model";
import { useApp } from "../context";
import { useInstall } from "../install";
import { setPin } from "../PinGate";
import { ChoiceRow, Icon, Mark, Toggle } from "../ui";
import { currentYear } from "./NewClass";

type Reminder = "week" | "fortnight" | "month" | "never";
type AddMode = "type" | "paste" | "roll";

interface Draft {
  name: string;
  school: string;
  board: string;
  medium: string;
  grade: string;
  section: string;
  year: string;
  subjects: string[];
  mode: AddMode;
  names: string[];
  paste: string;
  rolls: number;
  pinOn: boolean;
  pin: string;
  reminder: Reminder;
  classId: string | null;
}

const BOARDS = ["CBSE", "ICSE", "state", "other"] as const;
const MEDIUMS = ["hi", "en", "both"] as const;
const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D", ""];

export async function finishOnboarding(): Promise<void> {
  await putSetting("onboarded", true);
}

export default function Onboarding({ step }: { step: number }) {
  const { t, go, locale, setLocale } = useApp();
  const [d, setD] = useState<Draft>(() => ({
    name: "",
    school: "",
    board: "state",
    medium: locale === "hi" ? "hi" : "en",
    grade: "",
    section: "",
    year: currentYear(),
    subjects: [t("onb.subject.maths")],
    mode: "type",
    names: [],
    paste: "",
    rolls: 30,
    pinOn: false,
    pin: "",
    reminder: "week",
    classId: null,
  }));
  const [typed, setTyped] = useState("");
  const [extra, setExtra] = useState("");
  const [error, setError] = useState("");
  const install = useInstall();
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const to = (n: number) => {
    setError("");
    go(`/welcome/${n}`);
  };

  const subjectOptions = ["maths", "hindi", "english", "evs", "science"].map((k) =>
    t(`onb.subject.${k}` as "onb.subject.maths"),
  );
  const allSubjects = [...new Set([...subjectOptions, ...d.subjects])];
  const parsed = d.mode === "paste" && d.paste.trim() ? parseRoster(d.paste) : null;
  const count =
    d.mode === "type" ? d.names.length : d.mode === "paste" ? (parsed?.rows.length ?? 0) : d.rolls;
  const classLabel = d.grade
    ? t("class.label", { grade: d.grade, section: d.section }).trim()
    : t("onb.yourClass");

  const creating = useRef(false);
  const [saving, setSaving] = useState(false);
  const createClass = async () => {
    const db_ = db();
    const schoolId = newId();
    const classId = d.classId ?? newId();
    await db_.transaction("rw", db_.schools, db_.classes, db_.students, async () => {
      await db_.schools.add({ id: schoolId, name: d.school.trim() || t("onb.mySchool") });
      await db_.classes.add({
        id: classId,
        schoolId,
        grade: d.grade,
        section: d.section,
        year: d.year.trim(),
        subjects: d.subjects,
      });
      let rows: Array<{ roll: string; name: string }> = [];
      if (d.mode === "type") rows = d.names.map((name, i) => ({ roll: String(i + 1), name }));
      else if (d.mode === "paste") rows = parsed?.rows ?? [];
      else
        rows = Array.from({ length: d.rolls }, (_, i) => ({
          roll: String(i + 1),
          name: t("onb.rollName", { n: i + 1 }),
        }));
      await db_.students.bulkAdd(
        rows.map((r) => ({ id: newId(), classId, roll: r.roll, name: r.name, active: true })),
      );
    });
    set({ classId });
    await putSetting("profile", { name: d.name.trim(), board: d.board, medium: d.medium });
    return classId;
  };

  const finish = async (withSafety: boolean) => {
    if (withSafety && d.pinOn) {
      if (!/^\d{4,8}$/.test(d.pin)) return setError(t("pin.rule"));
      await setPin(d.pin);
    }
    await putSetting("backupReminder", withSafety ? d.reminder : "week");
    await finishOnboarding();
    to(8);
  };

  const addTyped = () => {
    const v = typed.trim();
    if (!v) return;
    set({ names: [...d.names, v] });
    setTyped("");
  };

  // Steps 4 to 7 need the draft; after a reload mid-way, start the setup part again.
  if (step >= 5 && step <= 7 && !d.grade && step !== 5) return <Restart onGo={() => to(4)} />;
  if (step === 8 && !d.classId) return <Restart onGo={() => go("/", true)} />;

  const promises = [
    { icon: "user", text: t("onb.p.noAccount") },
    { icon: "wifiOff", text: t("onb.p.offline") },
    { icon: "phone", text: t("onb.p.onPhone") },
  ] as const;

  return (
    <main className="onb" data-step={step}>
      {step === 0 ? (
        <>
          <div className="onb__body">
            <Mark size={72} />
            <h1 className="onb__hello">
              <span lang="hi">नमस्ते!</span>
              <span lang="en">Hello!</span>
            </h1>
            <p className="onb__lead">{t("onb.welcome", { product: PRODUCT_NAME })}</p>
            <p className="k-kicker">{t("onb.chooseLanguage")}</p>
            <div className="stack" style={{ gap: 10 }}>
              {(Object.keys(LOCALES) as Locale[])
                .sort((a) => (a === "hi" ? -1 : 1))
                .map((l) => (
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
          </div>
          <div className="onb__foot">
            <button type="button" className="btn btn--primary btn--block" onClick={() => to(1)}>
              {t("onb.continue")}
            </button>
            <p className="small muted center">{t("onb.changeLater")}</p>
          </div>
        </>
      ) : null}

      {step >= 1 && step <= 3 ? (
        <>
          <div className="onb__top">
            <span />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => to(4)}>
              {t("onb.skip")}
            </button>
          </div>
          <div className="onb__body">
            <div className="onb__art" aria-hidden="true">
              {step === 1 ? <ArtTap /> : step === 2 ? <ArtClass /> : <ArtPhone items={promises} />}
            </div>
            <h1>{t(`onb.s${step}.title` as "onb.s1.title")}</h1>
            <p className="onb__lead">{t(`onb.s${step}.body` as "onb.s1.body")}</p>
            <ol className="dots" aria-label={t("onb.progress", { n: step, total: 3 })}>
              {[1, 2, 3].map((n) => (
                <li key={n} aria-current={n === step ? "step" : undefined} />
              ))}
            </ol>
          </div>
          <div className="onb__foot">
            {step < 3 ? (
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => to(step + 1)}
              >
                {t("onb.next")}
              </button>
            ) : (
              <>
                <button type="button" className="btn btn--primary btn--block" onClick={() => to(4)}>
                  {t("onb.setUp")}
                </button>
                <a className="btn btn--block" href="/app?demo=1">
                  {t("onb.trySample")}
                </a>
              </>
            )}
          </div>
        </>
      ) : null}

      {step >= 4 && step <= 7 ? (
        <>
          <div className="onb__top">
            <button
              type="button"
              className="icon-btn"
              aria-label={t("nav.back")}
              onClick={() => to(step - 1)}
            >
              <Icon name="back" />
            </button>
            <div
              className="onb__progress"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={4}
              aria-valuenow={step - 3}
              aria-label={t("onb.stepOf", { n: step - 3, total: 4 })}
            >
              {[4, 5, 6, 7].map((n) => (
                <span key={n} data-on={n <= step} />
              ))}
            </div>
            <span className="small muted">{t("onb.stepOf", { n: step - 3, total: 4 })}</span>
          </div>

          {step === 4 ? (
            <form
              className="onb__body"
              onSubmit={(e) => {
                e.preventDefault();
                to(5);
              }}
            >
              <h1>{t("onb.about.title")}</h1>
              <p className="muted">{t("onb.about.body")}</p>
              <div className="field">
                <label htmlFor="o-name">{t("onb.about.name")}</label>
                <input
                  id="o-name"
                  className="input"
                  autoComplete="name"
                  value={d.name}
                  onChange={(e) => set({ name: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="o-school">{t("onb.about.school")}</label>
                <input
                  id="o-school"
                  className="input"
                  value={d.school}
                  onChange={(e) => set({ school: e.target.value })}
                />
              </div>
              <Chips
                label={t("onb.about.board")}
                options={BOARDS.map((b) => ({
                  value: b,
                  label: b === "state" || b === "other" ? t(`onb.board.${b}`) : b,
                }))}
                value={d.board}
                onChange={(board) => set({ board })}
              />
              <Chips
                label={t("onb.about.medium")}
                options={MEDIUMS.map((m) => ({ value: m, label: t(`onb.medium.${m}`) }))}
                value={d.medium}
                onChange={(medium) => set({ medium })}
              />
              <div className="onb__foot onb__foot--in">
                <button type="submit" className="btn btn--primary btn--block">
                  {t("onb.continue")}
                </button>
              </div>
            </form>
          ) : null}

          {step === 5 ? (
            <form
              className="onb__body"
              onSubmit={(e) => {
                e.preventDefault();
                if (!d.grade) return setError(t("newClass.needGrade"));
                to(6);
              }}
            >
              <h1>{t("onb.class.title")}</h1>
              <Chips
                label={t("onb.class.grade")}
                options={GRADES.map((g) => ({ value: g, label: g }))}
                value={d.grade}
                onChange={(grade) => set({ grade })}
                round
              />
              <Chips
                label={t("onb.class.section")}
                options={SECTIONS.map((s) => ({ value: s, label: s || t("onb.class.noSection") }))}
                value={d.section}
                onChange={(section) => set({ section })}
                round
              />
              <div className="field">
                <label htmlFor="o-year">{t("newClass.year")}</label>
                <input
                  id="o-year"
                  className="input num"
                  value={d.year}
                  onChange={(e) => set({ year: e.target.value })}
                />
              </div>
              <fieldset className="field chipset">
                <legend className="label">{t("onb.class.subjects")}</legend>
                <div className="cluster">
                  {allSubjects.map((s) => {
                    const on = d.subjects.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        className="ochip"
                        aria-pressed={on}
                        onClick={() =>
                          set({
                            subjects: on ? d.subjects.filter((x) => x !== s) : [...d.subjects, s],
                          })
                        }
                      >
                        {on ? <Icon name="check" /> : null}
                        {s}
                      </button>
                    );
                  })}
                </div>
                <div className="cluster" style={{ marginTop: 8 }}>
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: 0 }}
                    aria-label={t("onb.class.addSubject")}
                    placeholder={t("onb.class.addSubject")}
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => {
                      const v = extra.trim();
                      if (v && !d.subjects.includes(v)) set({ subjects: [...d.subjects, v] });
                      setExtra("");
                    }}
                  >
                    <Icon name="plus" />
                    {t("roster.addButton")}
                  </button>
                </div>
              </fieldset>
              {d.grade ? (
                <p className="callout">
                  <strong>
                    {classLabel} · {d.year}
                  </strong>
                  <span>{d.subjects.join(", ")}</span>
                </p>
              ) : null}
              {error ? (
                <p className="error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="onb__foot onb__foot--in">
                <button type="submit" className="btn btn--primary btn--block">
                  {t("onb.continue")}
                </button>
              </div>
            </form>
          ) : null}

          {step === 6 ? (
            <div className="onb__body">
              <h1>{t("onb.students.title")}</h1>
              <div className="modes" role="tablist" aria-label={t("onb.students.how")}>
                {(["type", "paste", "roll"] as AddMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={d.mode === m}
                    onClick={() => set({ mode: m })}
                  >
                    <Icon name={m === "type" ? "pencil" : m === "paste" ? "file" : "grid"} />
                    {t(`onb.students.${m}`)}
                  </button>
                ))}
              </div>
              {d.mode === "type" ? (
                <div className="card card--flush">
                  <ol className="namelist">
                    {d.names.map((n, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: two children can share a name; position is the identity here
                      <li key={`${i}-${n}`}>
                        <span className="num muted">{String(i + 1).padStart(2, "0")}</span>
                        <span className="namelist__name">{n}</span>
                        <button
                          type="button"
                          className="icon-btn icon-btn--sm"
                          aria-label={t("onb.students.remove", { name: n })}
                          onClick={() => set({ names: d.names.filter((_, j) => j !== i) })}
                        >
                          <Icon name="close" />
                        </button>
                      </li>
                    ))}
                  </ol>
                  <div className="namelist__add">
                    <span className="num muted">{String(d.names.length + 1).padStart(2, "0")}</span>
                    <input
                      className="input"
                      aria-label={t("onb.students.typeHint")}
                      placeholder={t("onb.students.typeHint")}
                      value={typed}
                      enterKeyHint="next"
                      onChange={(e) => setTyped(e.target.value)}
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTyped();
                        }
                      }}
                    />
                    <button type="button" className="btn btn--sm" onClick={addTyped}>
                      {t("roster.addButton")}
                    </button>
                  </div>
                </div>
              ) : null}
              {d.mode === "paste" ? (
                <div className="field">
                  <label htmlFor="o-paste">{t("onb.students.pasteLabel")}</label>
                  <textarea
                    id="o-paste"
                    className="textarea"
                    rows={8}
                    placeholder={t("roster.pasteHint")}
                    value={d.paste}
                    onChange={(e) => set({ paste: e.target.value })}
                  />
                  {parsed ? (
                    <span className="hint">{t("roster.found", { n: parsed.rows.length })}</span>
                  ) : null}
                </div>
              ) : null}
              {d.mode === "roll" ? (
                <div className="stack">
                  <p className="muted">{t("onb.students.rollBody")}</p>
                  <Stepper
                    label={t("onb.students.howMany")}
                    value={d.rolls}
                    min={1}
                    max={120}
                    onChange={(rolls) => set({ rolls })}
                  />
                </div>
              ) : null}
              <p className="small muted">{t("onb.students.hindiOk")}</p>
              {error ? (
                <p className="error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="onb__foot onb__foot--in">
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  disabled={saving}
                  onClick={async () => {
                    if (count === 0) return setError(t("onb.students.none"));
                    // One class, however many times the button is tapped.
                    if (creating.current) return;
                    creating.current = true;
                    setSaving(true);
                    try {
                      if (!d.classId) await createClass();
                      to(7);
                    } catch {
                      // The write is one transaction, so nothing half-saved is left behind.
                      setError(t("onb.saveFailed"));
                    } finally {
                      creating.current = false;
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? t("common.saving") : t("roster.add", { n: count })}
                </button>
              </div>
            </div>
          ) : null}

          {step === 7 ? (
            <div className="onb__body">
              <h1>{t("onb.safe.title")}</h1>
              <p className="muted">{t("onb.safe.body")}</p>
              <div className="card">
                <Toggle
                  on={d.pinOn}
                  onChange={(pinOn) => set({ pinOn })}
                  label={t("pin.settingsTitle")}
                  sub={t("onb.safe.pinSub")}
                />
                {d.pinOn ? (
                  <div className="field">
                    <label htmlFor="o-pin">{t("pin.new")}</label>
                    <input
                      id="o-pin"
                      className="input num"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={8}
                      value={d.pin}
                      onChange={(e) => set({ pin: e.target.value.replace(/\D/g, "") })}
                    />
                    <span className="hint">{t("pin.rule")}</span>
                  </div>
                ) : null}
              </div>
              <div className="card">
                <div className="toggle-row__text">
                  <strong>
                    <Icon name="shield" /> {t("onb.safe.reminder")}
                  </strong>
                  <span>{t("onb.safe.reminderSub")}</span>
                </div>
                <Chips
                  label={t("onb.safe.reminder")}
                  hideLabel
                  options={(["week", "fortnight", "month", "never"] as Reminder[]).map((r) => ({
                    value: r,
                    label: t(`onb.reminder.${r}`),
                  }))}
                  value={d.reminder}
                  onChange={(reminder) => set({ reminder: reminder as Reminder })}
                />
              </div>
              {error ? (
                <p className="error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="onb__foot onb__foot--in">
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={() => void finish(true)}
                >
                  {t("onb.safe.finish")}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--block"
                  onClick={() => void finish(false)}
                >
                  {t("onb.safe.skip")}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {step === 8 ? (
        <>
          <div className="onb__body">
            <Mark size={72} />
            <h1>{t("onb.ready.title", { cls: classLabel })}</h1>
            <dl className="summary card">
              <div>
                <dt>{t("onb.ready.students")}</dt>
                <dd className="num">{count}</dd>
              </div>
              <div>
                <dt>{t("onb.ready.subjects")}</dt>
                <dd>{d.subjects.join(", ") || "–"}</dd>
              </div>
              <div>
                <dt>{t("pin.settingsTitle")}</dt>
                <dd>{d.pinOn ? t("onb.on") : t("onb.off")}</dd>
              </div>
              <div>
                <dt>{t("onb.safe.reminder")}</dt>
                <dd>{t(`onb.reminder.${d.reminder}`)}</dd>
              </div>
            </dl>
            {!install.installed ? (
              <div className="card card--ink">
                <strong>
                  <Icon name="phone" /> {t("onb.ready.install", { product: PRODUCT_NAME })}
                </strong>
                <p className="small">{t("onb.ready.installBody")}</p>
                {install.canPrompt ? (
                  <button
                    type="button"
                    className="btn btn--accent btn--sm"
                    onClick={install.prompt}
                  >
                    <Icon name="download" />
                    {t("onb.ready.installGo")}
                  </button>
                ) : (
                  <p className="small">{t("onb.ready.installMenu")}</p>
                )}
              </div>
            ) : null}
          </div>
          <div className="onb__foot">
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => go(`/class/${d.classId}/new`, true)}
            >
              <Icon name="plus" />
              {t("onb.ready.firstTest")}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => go("/", true)}
            >
              {t("onb.ready.today")}
            </button>
          </div>
        </>
      ) : null}
    </main>
  );
}

function Restart({ onGo }: { onGo: () => void }) {
  const { t } = useApp();
  return (
    <main className="onb">
      <div className="onb__body">
        <Mark size={72} />
        <h1>{t("onb.restart")}</h1>
        <button type="button" className="btn btn--primary" onClick={onGo}>
          {t("onb.continue")}
        </button>
      </div>
    </main>
  );
}

function Chips({
  label,
  options,
  value,
  onChange,
  round,
  hideLabel,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  round?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <fieldset className="field chipset">
      <legend className={hideLabel ? "sr-only" : "label"}>{label}</legend>
      <div className="cluster">
        {options.map((o) => (
          <button
            key={o.value || "none"}
            type="button"
            className={`ochip${round && o.label.length <= 2 ? " ochip--round" : ""}`}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const { t } = useApp();
  return (
    <div className="stepper">
      <span className="label">{label}</span>
      <div className="stepper__ctl">
        <button
          type="button"
          aria-label={t("onb.less", { what: label })}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          −
        </button>
        <input
          className="num"
          type="number"
          inputMode="numeric"
          aria-label={label}
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, Math.round(n))));
          }}
        />
        <button
          type="button"
          aria-label={t("onb.more", { what: label })}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}

/* Illustrations, drawn in markup so they follow the language and the theme. */

function ArtTap() {
  const { t } = useApp();
  return (
    <div className="art card">
      <div className="spread">
        <strong>{t("onb.art.child")}</strong>
        <span className="pill pill--genda num">{t("onb.art.q", { q: 7, n: 20 })}</span>
      </div>
      <div className="art__keys">
        {["A", "B", "C", "D"].map((k) => (
          <span key={k} data-on={k === "C"}>
            {k}
          </span>
        ))}
      </div>
      <span className="small" style={{ color: "var(--right)" }}>
        ✓ {t("onb.art.right", { n: 13, total: 20 })}
      </span>
    </div>
  );
}

function ArtClass() {
  const { t } = useApp();
  const v = [88, 79, 75, 25, 71, 38, 82, 68];
  return (
    <div className="art card">
      <span className="small">{t("onb.art.hard")}</span>
      <div className="art__bars">
        {v.map((x, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed illustration
          <span key={`q${i + 1}`} style={{ height: `${x}%` }} data-low={x < 50} />
        ))}
      </div>
      <div className="art__labels num">
        {v.map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed illustration
          <span key={`l${i + 1}`}>Q{i + 1}</span>
        ))}
      </div>
    </div>
  );
}

function ArtPhone({
  items,
}: {
  items: ReadonlyArray<{ icon: "user" | "wifiOff" | "phone"; text: string }>;
}) {
  return (
    <div className="art card art--row">
      <Mark size={56} />
      <ul>
        {items.map((x) => (
          <li key={x.icon}>
            <Icon name={x.icon} />
            {x.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
