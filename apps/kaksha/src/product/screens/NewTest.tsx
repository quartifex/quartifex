"use client";
import { useState } from "react";
import mathsExample from "../../../public/templates/example-primary-maths-g3.json";
import readingExample from "../../../public/templates/example-reading-fluency.json";
import writingExample from "../../../public/templates/example-writing.json";
import { todayIso } from "../../i18n";
import { db } from "../../lib/db";
import {
  type Assessment,
  CHOICES,
  type Choice,
  type KeyItem,
  newId,
  type RubricItem,
} from "../../lib/model";
import { parseTemplate, type Template } from "../../lib/template";
import { useApp } from "../context";
import { useClass } from "../data";
import { Icon, TopBar } from "../ui";
import { useAction } from "../useAction";

const EXAMPLES = [mathsExample, readingExample, writingExample];

export function templateToAssessment(
  tpl: Template,
  classId: string,
  title: string,
  date: string,
): Assessment {
  const base = {
    id: newId(),
    classId,
    title,
    subject: tpl.subject,
    date,
    templateId: tpl.id,
    createdAt: Date.now(),
  };
  if (tpl.kind === "key") {
    return {
      ...base,
      kind: "key",
      items: tpl.items.map((i) => ({
        id: newId(),
        label: i.label,
        domain: i.domain,
        type: i.type,
        key: i.key,
        marks: i.marks,
      })),
    };
  }
  return {
    ...base,
    kind: "rubric",
    items: tpl.items.map((c) => ({
      id: newId(),
      label: c.label,
      domain: c.domain,
      levels: [...c.levels]
        .sort((a, b) => a.score - b.score)
        .map((l) => ({ score: l.score, label: l.label, descriptor: l.descriptor })),
    })),
  };
}

type Mode = "pick" | "key" | "rubric";

export default function NewTest({ classId }: { classId: string }) {
  const { t, go } = useApp();
  const info = useClass(classId);
  const [mode, setMode] = useState<Mode>("pick");
  const [errors, setErrors] = useState<string[]>([]);
  const label = info ? t("class.label", { grade: info.cls.grade, section: info.cls.section }) : "";

  const fromTemplate = async (json: unknown) => {
    const parsed = parseTemplate(json);
    if (!parsed.ok) {
      setErrors(parsed.errors.slice(0, 8));
      return;
    }
    const a = templateToAssessment(parsed.value, classId, parsed.value.title, todayIso());
    await db().assessments.add(a);
    go(`/test/${a.id}/mark`, true);
  };

  return (
    <>
      <TopBar
        title={t("newTest.title")}
        sub={label}
        back={mode === "pick" ? `/class/${classId}` : undefined}
      />
      {mode !== "pick" ? (
        <div className="k-main" style={{ paddingBottom: 0 }}>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setMode("pick")}
            style={{ alignSelf: "flex-start" }}
          >
            <Icon name="back" />
            {t("nav.back")}
          </button>
        </div>
      ) : null}
      <main className="k-main">
        {mode === "pick" ? (
          <>
            <section className="stack" aria-labelledby="scratch-h">
              <h2 id="scratch-h">{t("newTest.scratch")}</h2>
              <div className="grid2">
                <button type="button" className="row-link" onClick={() => setMode("key")}>
                  <span className="row-link__body">
                    <span className="row-link__title">{t("newTest.keyTitle")}</span>
                    <span className="row-link__meta">{t("newTest.keyBody")}</span>
                  </span>
                </button>
                <button type="button" className="row-link" onClick={() => setMode("rubric")}>
                  <span className="row-link__body">
                    <span className="row-link__title">{t("newTest.rubricTitle")}</span>
                    <span className="row-link__meta">{t("newTest.rubricBody")}</span>
                  </span>
                </button>
              </div>
            </section>
            <section className="stack" aria-labelledby="ex-h">
              <h2 id="ex-h">{t("newTest.examples")}</h2>
              <p className="small muted">{t("newTest.examplesNote")}</p>
              <ul className="list">
                {EXAMPLES.map((ex) => (
                  <li key={ex.id}>
                    <button type="button" className="row-link" onClick={() => fromTemplate(ex)}>
                      <span className="row-link__body">
                        <span className="row-link__title">{ex.title}</span>
                        <span className="row-link__meta">
                          {ex.kind === "key"
                            ? t("test.kind.key", { n: ex.items.length })
                            : t("test.kind.rubric", { n: ex.items.length })}{" "}
                          · {t("newTest.example")}
                        </span>
                      </span>
                      <span className="chev">
                        <Icon name="chev" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <label className="btn">
                <Icon name="upload" />
                {t("newTest.importTemplate")}
                <input
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    try {
                      await fromTemplate(JSON.parse(await f.text()));
                    } catch {
                      setErrors([t("newTest.notJson")]);
                    }
                  }}
                />
              </label>
              {errors.length ? (
                <div className="notice notice--bad" role="alert">
                  <p>{t("newTest.templateErrors")}</p>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                    {errors.map((e) => (
                      <li key={e}>
                        <code>{e}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
        {mode === "key" ? <KeyBuilder classId={classId} /> : null}
        {mode === "rubric" ? <RubricBuilder classId={classId} /> : null}
      </main>
    </>
  );
}

function Basics({
  title,
  setTitle,
  subject,
  setSubject,
  date,
  setDate,
}: {
  title: string;
  setTitle: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
}) {
  const { t } = useApp();
  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="t-title">{t("newTest.name")}</label>
        <input
          id="t-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("newTest.namePlaceholder")}
        />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="t-subject">{t("newTest.subject")}</label>
          <input
            id="t-subject"
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            list="subjects"
          />
          <datalist id="subjects">
            {t("newTest.subjects")
              .split("|")
              .map((s) => (
                <option key={s} value={s} />
              ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="t-date">{t("newTest.date")}</label>
          <input
            id="t-date"
            type="date"
            className="input num"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function KeyBuilder({ classId }: { classId: string }) {
  const { t, go } = useApp();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<"choice" | "rightwrong">("choice");
  const [count, setCount] = useState(20);
  const [keys, setKeys] = useState<Array<Choice | null>>(() => Array(20).fill(null));
  const [domains, setDomains] = useState<string[]>(() => Array(20).fill(""));
  const [rowIds, setRowIds] = useState<string[]>(() => Array.from({ length: 20 }, () => newId()));
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState("");

  const resize = (n: number) => {
    const size = Math.max(1, Math.min(100, n || 1));
    setCount(size);
    setKeys((k) => Array.from({ length: size }, (_, i) => k[i] ?? null));
    setDomains((d) => Array.from({ length: size }, (_, i) => d[i] ?? ""));
    setRowIds((r) => Array.from({ length: size }, (_, i) => r[i] ?? newId()));
    setCursor((c) => Math.min(c, size - 1));
  };

  const setKey = (i: number, c: Choice) => {
    setKeys((k) => k.map((v, j) => (j === i ? c : v)));
    if (i === cursor && cursor < count - 1) setCursor(cursor + 1);
  };

  const [busy, run] = useAction();
  const create = async () => {
    if (!title.trim()) return setError(t("newTest.needName"));
    if (type === "choice" && keys.some((k) => k === null)) return setError(t("newTest.needKeys"));
    const items: KeyItem[] = keys.map((k, i) => ({
      id: newId(),
      label: `Q${i + 1}`,
      domain: domains[i]?.trim() ?? "",
      type,
      key: type === "choice" ? k : null,
      marks: 1,
    }));
    const a: Assessment = {
      id: newId(),
      classId,
      title: title.trim(),
      subject: subject.trim(),
      date,
      createdAt: Date.now(),
      kind: "key",
      items,
    };
    await run(
      async () => {
        await db().assessments.add(a);
        go(`/test/${a.id}/mark`, true);
      },
      () => setError(t("common.saveFailed")),
    );
  };

  const knownDomains = [...new Set(domains.filter(Boolean))];

  return (
    <div className="stack">
      <Basics {...{ title, setTitle, subject, setSubject, date, setDate }} />
      <div className="grid2">
        <div className="field">
          <label htmlFor="q-count">{t("newTest.questions")}</label>
          <input
            id="q-count"
            type="number"
            min={1}
            max={100}
            className="input num"
            value={count}
            onChange={(e) => resize(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <span className="label" id="q-type">
            {t("newTest.answerType")}
          </span>
          <fieldset className="seg" aria-labelledby="q-type">
            <button
              type="button"
              aria-pressed={type === "choice"}
              onClick={() => setType("choice")}
            >
              A B C D
            </button>
            <button
              type="button"
              aria-pressed={type === "rightwrong"}
              onClick={() => setType("rightwrong")}
            >
              {t("newTest.rightWrong")}
            </button>
          </fieldset>
        </div>
      </div>

      {type === "choice" ? (
        <div className="card">
          <h3>{t("newTest.enterKey", { q: cursor + 1 })}</h3>
          <fieldset className="pad" aria-label={t("newTest.enterKey", { q: cursor + 1 })}>
            {CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                className="key"
                aria-pressed={keys[cursor] === c}
                onClick={() => setKey(cursor, c)}
              >
                {c}
              </button>
            ))}
          </fieldset>
          <p className="small muted">{t("newTest.keyHint")}</p>
        </div>
      ) : null}

      <datalist id="domains">
        {knownDomains.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <ol className="list" aria-label={t("newTest.questions")}>
        {keys.map((k, i) => (
          <li
            key={rowIds[i]}
            className="card"
            style={{ padding: 10, gap: 8, borderColor: i === cursor ? "var(--ink)" : undefined }}
          >
            <div className="spread">
              <button
                type="button"
                className="btn btn--ghost btn--sm num"
                onClick={() => setCursor(i)}
                aria-label={t("newTest.selectQ", { q: i + 1 })}
              >
                Q{i + 1}
              </button>
              {type === "choice" ? (
                <fieldset className="seg" aria-label={t("newTest.keyFor", { q: i + 1 })}>
                  {CHOICES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={k === c}
                      onClick={() => setKey(i, c)}
                    >
                      {c}
                    </button>
                  ))}
                </fieldset>
              ) : null}
            </div>
            <input
              className="input"
              list="domains"
              aria-label={t("newTest.domainFor", { q: i + 1 })}
              placeholder={t("newTest.domainPlaceholder")}
              value={domains[i] ?? ""}
              onChange={(e) => setDomains((d) => d.map((v, j) => (j === i ? e.target.value : v)))}
              onBlur={() => {
                // Carry a new tag down to the untagged questions that follow.
                setDomains((d) => {
                  const v = d[i] ?? "";
                  if (!v) return d;
                  const out = [...d];
                  for (let j = i + 1; j < out.length && !out[j]; j++) out[j] = v;
                  return out;
                });
              }}
            />
          </li>
        ))}
      </ol>
      <p className="small muted">{t("newTest.domainHint")}</p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={create}
        disabled={busy}
      >
        {busy ? t("common.saving") : t("newTest.create")}
      </button>
    </div>
  );
}

function RubricBuilder({ classId }: { classId: string }) {
  const { t, go } = useApp();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(todayIso());
  const [levels, setLevels] = useState(4);
  const [criteria, setCriteria] = useState<Array<{ label: string; domain: string }>>([
    { label: "", domain: "" },
  ]);
  const [error, setError] = useState("");

  const [busy, run] = useAction();
  const create = async () => {
    if (!title.trim()) return setError(t("newTest.needName"));
    const named = criteria.filter((c) => c.label.trim());
    if (!named.length) return setError(t("newTest.needCriteria"));
    const items: RubricItem[] = named.map((c) => ({
      id: newId(),
      label: c.label.trim(),
      domain: c.domain.trim(),
      levels: Array.from({ length: levels }, (_, i) => ({
        score: i + 1,
        label: t("newTest.levelN", { n: i + 1 }),
        descriptor: "",
      })),
    }));
    const a: Assessment = {
      id: newId(),
      classId,
      title: title.trim(),
      subject: subject.trim(),
      date,
      createdAt: Date.now(),
      kind: "rubric",
      items,
    };
    await run(
      async () => {
        await db().assessments.add(a);
        go(`/test/${a.id}/mark`, true);
      },
      () => setError(t("common.saveFailed")),
    );
  };

  return (
    <div className="stack">
      <Basics {...{ title, setTitle, subject, setSubject, date, setDate }} />
      <div className="field">
        <span className="label" id="lv">
          {t("newTest.levels")}
        </span>
        <fieldset className="seg" aria-labelledby="lv">
          {[3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={levels === n} onClick={() => setLevels(n)}>
              {n}
            </button>
          ))}
        </fieldset>
      </div>
      <ol className="list">
        {criteria.map((c, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: criteria are positional while being typed
          <li key={i} className="card" style={{ padding: 12 }}>
            <div className="field">
              <label htmlFor={`c-${i}`}>{t("newTest.criterion", { n: i + 1 })}</label>
              <input
                id={`c-${i}`}
                className="input"
                value={c.label}
                onChange={(e) =>
                  setCriteria((all) =>
                    all.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                  )
                }
              />
            </div>
            <input
              className="input"
              aria-label={t("newTest.domainFor", { q: i + 1 })}
              placeholder={t("newTest.domainPlaceholder")}
              value={c.domain}
              onChange={(e) =>
                setCriteria((all) =>
                  all.map((x, j) => (j === i ? { ...x, domain: e.target.value } : x)),
                )
              }
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="btn"
        onClick={() => setCriteria((all) => [...all, { label: "", domain: "" }])}
      >
        <Icon name="plus" />
        {t("newTest.addCriterion")}
      </button>
      <p className="small muted">{t("newTest.rubricHint")}</p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={create}
        disabled={busy}
      >
        {busy ? t("common.saving") : t("newTest.create")}
      </button>
    </div>
  );
}
