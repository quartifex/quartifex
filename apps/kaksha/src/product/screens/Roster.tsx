"use client";
import { type FormEvent, useState } from "react";
import { parseRoster, ROSTER_TEMPLATE, type RosterParse } from "../../lib/csv";
import { db } from "../../lib/db";
import { newId, type Student } from "../../lib/model";
import { useApp } from "../context";
import { useClass, useStudents } from "../data";
import { saveText } from "../files";
import { Icon, Sheet, TopBar } from "../ui";

export default function Roster({ classId }: { classId: string }) {
  const { t, locale, go } = useApp();
  const info = useClass(classId);
  const students = useStudents(classId, locale);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<RosterParse | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);

  if (info === null) return null;
  const label = info ? t("class.label", { grade: info.cls.grade, section: info.cls.section }) : "";
  const existingRolls = new Set((students ?? []).map((s) => s.roll));

  const read = (source: string) => {
    setSaved(null);
    setText(source);
    setPreview(source.trim() ? parseRoster(source) : null);
  };

  const commit = async () => {
    if (!preview) return;
    const fresh = preview.rows.filter((r) => !existingRolls.has(r.roll));
    await db().students.bulkAdd(
      fresh.map((r) => ({ id: newId(), classId, roll: r.roll, name: r.name, active: true })),
    );
    setSaved(fresh.length);
    setPreview(null);
    setText("");
  };

  const reasons: Record<string, string> = {
    "no-name": t("roster.problem.noName"),
    "duplicate-roll": t("roster.problem.dupRoll"),
    "too-long": t("roster.problem.tooLong"),
    "duplicate-name": t("roster.problem.dupName"),
  };

  const clashes = preview ? preview.rows.filter((r) => existingRolls.has(r.roll)) : [];

  return (
    <>
      <TopBar title={t("roster.title")} sub={label} back={`/class/${classId}/students`} />
      <main className="k-main">
        <section className="card" aria-labelledby="import-h">
          <h2 id="import-h">{t("roster.importTitle")}</h2>
          <p className="muted">{t("roster.importBody")}</p>
          <div className="cluster">
            <label className="btn">
              <Icon name="upload" />
              {t("roster.chooseFile")}
              <input
                type="file"
                accept=".csv,text/csv,text/plain,.tsv"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) read(await f.text());
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => saveText("kaksha-roster-template.csv", ROSTER_TEMPLATE, "text/csv")}
            >
              <Icon name="download" />
              {t("roster.template")}
            </button>
          </div>
          <div className="field">
            <label htmlFor="paste">{t("roster.paste")}</label>
            <textarea
              id="paste"
              className="textarea"
              value={text}
              onChange={(e) => read(e.target.value)}
              placeholder={t("roster.pasteHint")}
              spellCheck={false}
            />
          </div>
          {preview ? (
            <div className="stack" aria-live="polite">
              <p>
                <strong>{t("roster.found", { n: preview.rows.length - clashes.length })}</strong>
              </p>
              {preview.problems.length || clashes.length ? (
                <div className="notice notice--warn">
                  <p>{t("roster.skipped")}</p>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                    {preview.problems.map((p) => (
                      <li key={`${p.line}-${p.reason}`}>
                        {t("roster.line", { n: p.line })}: {reasons[p.reason]}
                        {p.reason === "duplicate-name" ? ` (${t("roster.keptAnyway")})` : ""}
                      </li>
                    ))}
                    {clashes.map((c) => (
                      <li key={`clash-${c.roll}`}>
                        {t("roster.alreadyHave", { roll: c.roll, name: c.name })}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <ol
                className="small"
                style={{ margin: 0, paddingLeft: 20, maxHeight: 200, overflow: "auto" }}
              >
                {preview.rows
                  .filter((r) => !existingRolls.has(r.roll))
                  .map((r) => (
                    <li key={r.roll}>
                      <span className="num">{r.roll}</span> {r.name}
                    </li>
                  ))}
              </ol>
              <button
                type="button"
                className="btn btn--primary"
                onClick={commit}
                disabled={preview.rows.length - clashes.length === 0}
              >
                {t("roster.add", { n: preview.rows.length - clashes.length })}
              </button>
            </div>
          ) : null}
          {saved !== null ? (
            <p className="notice notice--ok" role="status">
              {t("roster.saved", { n: saved })}
            </p>
          ) : null}
        </section>

        <AddOne
          classId={classId}
          taken={existingRolls}
          nextRoll={String((students?.length ?? 0) + 1)}
        />

        <section aria-labelledby="list-h" className="stack">
          <h2 id="list-h">
            {t("roster.list", { n: students?.filter((s) => s.active).length ?? 0 })}
          </h2>
          <ul className="list">
            {(students ?? []).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="row-link"
                  onClick={() => setEditing(s)}
                  style={{ minHeight: 56 }}
                >
                  <span className="num" style={{ minWidth: 36 }}>
                    {s.roll}
                  </span>
                  <span className="row-link__body">
                    <span
                      className="row-link__title"
                      style={
                        s.active
                          ? undefined
                          : { textDecoration: "line-through", color: "var(--ink-3)" }
                      }
                    >
                      {s.name}
                    </span>
                    {!s.active ? <span className="row-link__meta">{t("roster.left")}</span> : null}
                  </span>
                  <Icon name="pencil" />
                </button>
              </li>
            ))}
          </ul>
          {students && students.length > 0 ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => go(`/class/${classId}`)}
            >
              {t("roster.done")}
            </button>
          ) : null}
        </section>
      </main>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={t("roster.edit")}>
        {editing ? <EditStudent student={editing} onDone={() => setEditing(null)} /> : null}
      </Sheet>
    </>
  );
}

function AddOne({
  classId,
  taken,
  nextRoll,
}: {
  classId: string;
  taken: Set<string>;
  nextRoll: string;
}) {
  const { t } = useApp();
  const [roll, setRoll] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = (roll.trim() || nextRoll).slice(0, 12);
    if (!name.trim()) return setError(t("roster.problem.noName"));
    if (taken.has(r)) return setError(t("roster.problem.dupRoll"));
    await db().students.add({ id: newId(), classId, roll: r, name: name.trim(), active: true });
    setRoll("");
    setName("");
    setError("");
  };
  return (
    <form className="card" onSubmit={submit} aria-labelledby="add-h">
      <h2 id="add-h">{t("roster.addOne")}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 10 }}>
        <div className="field">
          <label htmlFor="roll">{t("roster.roll")}</label>
          <input
            id="roll"
            className="input num"
            inputMode="numeric"
            value={roll}
            placeholder={nextRoll}
            onChange={(e) => setRoll(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="name">{t("roster.name")}</label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn">
        <Icon name="plus" />
        {t("roster.addButton")}
      </button>
    </form>
  );
}

function EditStudent({ student, onDone }: { student: Student; onDone: () => void }) {
  const { t } = useApp();
  const [name, setName] = useState(student.name);
  const [roll, setRoll] = useState(student.roll);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        await db().students.update(student.id, {
          name: name.trim(),
          roll: roll.trim() || student.roll,
        });
        onDone();
      }}
    >
      <div className="field">
        <label htmlFor="e-roll">{t("roster.roll")}</label>
        <input
          id="e-roll"
          className="input num"
          value={roll}
          onChange={(e) => setRoll(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="e-name">{t("roster.name")}</label>
        <input
          id="e-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn--primary">
        {t("common.save")}
      </button>
      <button
        type="button"
        className="btn"
        onClick={async () => {
          await db().students.update(student.id, { active: !student.active });
          onDone();
        }}
      >
        {student.active ? t("roster.markLeft") : t("roster.markBack")}
      </button>
      <p className="small muted">{t("roster.leftHint")}</p>
    </form>
  );
}
