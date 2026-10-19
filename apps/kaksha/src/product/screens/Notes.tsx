"use client";
// A teacher's dated notes about one child. On this phone only; optionally on the card.
import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useState } from "react";
import { formatDate } from "../../i18n";
import { addNote, db } from "../../lib/db";
import { useApp } from "../context";
import { useNotes } from "../data";
import { offerUndo } from "../UndoBar";
import { Empty, Icon, NotFound, Toggle, TopBar } from "../ui";

const NOTE_MAX = 500;

export default function Notes({ studentId }: { studentId: string }) {
  const { t, locale } = useApp();
  const student = useLiveQuery(
    async () => (await db().students.get(studentId)) ?? null,
    [studentId],
  );
  const notes = useNotes(studentId);
  const [text, setText] = useState("");
  const [onCard, setOnCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (student === null) return <NotFound />;
  if (!student || !notes) return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await addNote(studentId, text.trim(), onCard);
      setText("");
      setOnCard(false);
    } catch {
      // Keep what the teacher typed; say so next to the button.
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <TopBar title={t("notes.title")} sub={student.name} back={`/student/${studentId}`} />
      <main className="k-main">
        <form className="card" onSubmit={submit}>
          <div className="field">
            <label htmlFor="note-new">{t("notes.new")}</label>
            <textarea
              id="note-new"
              className="textarea"
              rows={3}
              value={text}
              placeholder={t("notes.placeholder")}
              maxLength={NOTE_MAX}
              aria-describedby="note-count"
              onChange={(e) => setText(e.target.value)}
            />
            <p id="note-count" className="small muted num">
              {t("notes.count", { n: text.length, max: NOTE_MAX })}
            </p>
          </div>
          <Toggle on={onCard} onChange={setOnCard} label={t("notes.onCard")} />
          {failed ? (
            <p className="error" role="alert">
              {t("notes.failed")}
            </p>
          ) : null}
          <button type="submit" className="btn btn--primary" disabled={!text.trim() || busy}>
            <Icon name="plus" />
            {t("notes.add")}
          </button>
        </form>
        {notes.length === 0 ? (
          <p className="muted">{t("notes.none")}</p>
        ) : (
          <ol className="timeline">
            {notes.map((n) => (
              <li key={n.id}>
                <span className="timeline__date num">{formatDate(n.date)}</span>
                <div className="timeline__body">
                  <p>{n.text}</p>
                  <div className="cluster">
                    <button
                      type="button"
                      className={`ochip ochip--sm`}
                      aria-pressed={n.onCard}
                      onClick={() => void db().notes.update(n.id, { onCard: !n.onCard })}
                    >
                      {n.onCard ? <Icon name="check" /> : null}
                      {t("notes.onCardShort")}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={async () => {
                        await db().notes.delete(n.id);
                        offerUndo(t("undo.noteDeleted"), t("undo.noteBack"), async () => {
                          await db().notes.put(n);
                        });
                      }}
                    >
                      <Icon name="trash" />
                      {t("notes.delete")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="small muted">{t("notes.privacy")}</p>
      </main>
    </>
  );
}
