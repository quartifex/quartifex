"use client";
// The entry screen: the reason the app exists. One tap records an answer and moves
// on, every tap is saved straight away, and every tap can be undone.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, setAbsent, setAnswer, setNote } from "../../lib/db";
import {
  type Assessment,
  BLANK,
  CHOICES,
  type KeyAssessment,
  type RubricAssessment,
  type Student,
} from "../../lib/model";
import { itemPoints } from "../../lib/scoring";
import { useApp } from "../context";
import { sortStudents, useAssessment } from "../data";
import { Empty, Icon, TopBar } from "../ui";

type Values = Map<string, string>; // `${studentId}|${itemId}` -> value
const k = (s: string, i: string) => `${s}|${i}`;

interface Undo {
  kind: "answer" | "absent";
  studentId: string;
  itemId: string;
  prev: string | undefined | boolean;
  q: number;
  s: number;
}

type Mode = "question" | "student";
const MODE_KEY = "kaksha-entry-mode";

function useEntryData(a: Assessment | null | undefined) {
  const { locale } = useApp();
  const [state, setState] = useState<{
    students: Student[];
    values: Values;
    absent: Set<string>;
    notes: Map<string, string>;
  } | null>(null);
  useEffect(() => {
    if (!a) return;
    let live = true;
    (async () => {
      const [students, answers, sittings] = await Promise.all([
        db().students.where("classId").equals(a.classId).toArray(),
        db().responses.where("assessmentId").equals(a.id).toArray(),
        db().sittings.where("assessmentId").equals(a.id).toArray(),
      ]);
      if (!live) return;
      const withData = new Set([
        ...answers.map((r) => r.studentId),
        ...sittings.map((s) => s.studentId),
      ]);
      setState({
        students: sortStudents(
          students.filter((s) => s.active || withData.has(s.id)),
          locale,
        ),
        values: new Map(answers.map((r) => [k(r.studentId, r.itemId), r.value])),
        absent: new Set(sittings.filter((s) => s.absent).map((s) => s.studentId)),
        notes: new Map(sittings.map((s) => [s.studentId, s.note])),
      });
    })();
    return () => {
      live = false;
    };
  }, [a, locale]);
  return [state, setState] as const;
}

export default function Mark({
  assessmentId,
  start,
}: {
  assessmentId: string;
  start?: string | undefined;
}) {
  const { t, go } = useApp();
  const a = useAssessment(assessmentId);
  const [data, setData] = useEntryData(a);

  if (a === null) {
    return (
      <>
        <TopBar back="/" />
        <main className="k-main">
          <Empty title={t("common.notFound")} />
        </main>
      </>
    );
  }
  if (!a || !data) return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
  if (data.students.length === 0) {
    return (
      <>
        <TopBar title={a.title} back={`/class/${a.classId}`} />
        <main className="k-main">
          <Empty title={t("class.noStudents")} body={t("class.noStudentsBody")}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => go(`/class/${a.classId}/roster`)}
            >
              {t("class.addStudents")}
            </button>
          </Empty>
        </main>
      </>
    );
  }
  return a.kind === "key" ? (
    <KeyEntry a={a} data={data} setData={setData} start={start} />
  ) : (
    <RubricEntry a={a} data={data} setData={setData} start={start} />
  );
}

type EntryData = NonNullable<ReturnType<typeof useEntryData>[0]>;
type SetEntryData = ReturnType<typeof useEntryData>[1];

function useAnnounce() {
  const [msg, setMsg] = useState("");
  const el = (
    <p className="sr-only" aria-live="polite" role="status">
      {msg}
    </p>
  );
  return [el, setMsg] as const;
}

function KeyEntry({
  a,
  data,
  setData,
  start,
}: {
  a: KeyAssessment;
  data: EntryData;
  setData: SetEntryData;
  start?: string | undefined;
}) {
  const { t, go } = useApp();
  const [mode, setModeState] = useState<Mode>(() => {
    try {
      return localStorage.getItem(MODE_KEY) === "student" ? "student" : "question";
    } catch {
      return "question";
    }
  });
  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  };
  const { students, values, absent } = data;
  const items = a.items;

  // Start where the teacher left off: the first empty cell in the current mode's order.
  const firstGap = useCallback(
    (m: Mode) => {
      if (m === "question") {
        for (let q = 0; q < items.length; q++)
          for (let s = 0; s < students.length; s++) {
            const st = students[s];
            const it = items[q];
            if (st && it && !absent.has(st.id) && !values.has(k(st.id, it.id))) return { q, s };
          }
      } else {
        for (let s = 0; s < students.length; s++)
          for (let q = 0; q < items.length; q++) {
            const st = students[s];
            const it = items[q];
            if (st && it && !absent.has(st.id) && !values.has(k(st.id, it.id))) return { q, s };
          }
      }
      return null;
    },
    [items, students, values, absent],
  );

  const [pos, setPos] = useState(() => {
    if (start) {
      const [sid, iid] = start.split("~");
      const s = students.findIndex((x) => x.id === sid);
      const q = items.findIndex((x) => x.id === iid);
      if (s >= 0) return { q: Math.max(0, q), s };
    }
    return firstGap(mode) ?? { q: 0, s: 0 };
  });
  const [undo, setUndo] = useState<Undo[]>([]);
  const [announce, say] = useAnnounce();
  const stripRef = useRef<HTMLFieldSetElement>(null);

  const student = students[pos.s] as Student;
  const item = items[pos.q] ?? items[0];
  const entered = useMemo(() => {
    let n = 0;
    for (const st of students) {
      if (absent.has(st.id)) {
        n += items.length;
        continue;
      }
      for (const it of items) if (values.has(k(st.id, it.id))) n++;
    }
    return n;
  }, [students, items, values, absent]);
  const total = students.length * items.length;
  const done = entered === total;

  // Next cell in the current order, skipping absent students.
  const advance = useCallback(
    (from: { q: number; s: number }, absentNow: Set<string>) => {
      let { q, s } = from;
      for (let guard = 0; guard < total + 1; guard++) {
        if (mode === "question") {
          s++;
          if (s >= students.length) {
            s = 0;
            q++;
          }
        } else {
          q++;
          if (q >= items.length) {
            q = 0;
            s++;
          }
        }
        if (q >= items.length || s >= students.length) return from;
        const st = students[s];
        if (st && !absentNow.has(st.id)) return { q, s };
      }
      return from;
    },
    [mode, students, items, total],
  );

  const step = (dir: 1 | -1) => {
    setPos((p) => {
      if (mode === "question") {
        let s = p.s + dir;
        let q = p.q;
        if (s < 0) {
          if (q === 0) return p;
          q -= 1;
          s = students.length - 1;
        } else if (s >= students.length) {
          if (q === items.length - 1) return p;
          q += 1;
          s = 0;
        }
        return { q, s };
      }
      let q = p.q + dir;
      let s = p.s;
      if (q < 0) {
        if (s === 0) return p;
        s -= 1;
        q = items.length - 1;
      } else if (q >= items.length) {
        if (s === students.length - 1) return p;
        s += 1;
        q = 0;
      }
      return { q, s };
    });
  };

  const record = async (value: string) => {
    if (!item || !student) return;
    // Start the write first, in the same task as the tap, so the window in which a
    // closed tab could lose it is as small as possible.
    const write = setAnswer(a.id, student.id, item.id, value);
    const key = k(student.id, item.id);
    const before = values.get(key);
    const wasAbsent = absent.has(student.id);
    const nextValues = new Map(values);
    nextValues.set(key, value);
    const nextAbsent = new Set(absent);
    nextAbsent.delete(student.id);
    setData({ ...data, values: nextValues, absent: nextAbsent });
    setUndo((u) => [
      ...u.slice(-199),
      { kind: "answer", studentId: student.id, itemId: item.id, prev: before, q: pos.q, s: pos.s },
    ]);
    if (wasAbsent)
      setUndo((u) => [
        ...u,
        { kind: "absent", studentId: student.id, itemId: "", prev: true, q: pos.q, s: pos.s },
      ]);
    say(
      `${item.label}, ${student.name}: ${value === BLANK ? t("entry.blank") : value === "R" ? t("entry.right") : value === "W" ? t("entry.wrong") : value}`,
    );
    setPos(advance(pos, nextAbsent));
    await write;
  };

  const markAbsent = async () => {
    if (!student) return;
    const nextAbsent = new Set(absent);
    const now = !absent.has(student.id);
    if (now) nextAbsent.add(student.id);
    else nextAbsent.delete(student.id);
    setData({ ...data, absent: nextAbsent });
    setUndo((u) => [
      ...u,
      { kind: "absent", studentId: student.id, itemId: "", prev: !now, q: pos.q, s: pos.s },
    ]);
    say(`${student.name}: ${now ? t("entry.absent") : t("entry.present")}`);
    if (now) setPos(advance(pos, nextAbsent));
    await setAbsent(a.id, student.id, now);
  };

  const undoLast = async () => {
    const last = undo[undo.length - 1];
    if (!last) return;
    setUndo((u) => u.slice(0, -1));
    setPos({ q: last.q, s: last.s });
    if (last.kind === "answer") {
      const nextValues = new Map(values);
      const key = k(last.studentId, last.itemId);
      if (last.prev === undefined) nextValues.delete(key);
      else nextValues.set(key, last.prev as string);
      setData({ ...data, values: nextValues });
      say(t("entry.undone"));
      await setAnswer(a.id, last.studentId, last.itemId, last.prev as string | undefined);
    } else {
      const nextAbsent = new Set(absent);
      if (last.prev) nextAbsent.add(last.studentId);
      else nextAbsent.delete(last.studentId);
      setData({ ...data, absent: nextAbsent });
      say(t("entry.undone"));
      await setAbsent(a.id, last.studentId, Boolean(last.prev));
    }
  };

  // Keyboard: A to D or 1 to 4, R and W, space for blank, X for absent, Z or Backspace to undo.
  const handlers = useRef({ record, markAbsent, undoLast, step });
  handlers.current = { record, markAbsent, undoLast, step };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const h = handlers.current;
      const key = e.key.toLowerCase();
      const map: Record<string, string> = {
        a: "A",
        b: "B",
        c: "C",
        d: "D",
        "1": "A",
        "2": "B",
        "3": "C",
        "4": "D",
      };
      if (item?.type === "choice" && map[key]) h.record(map[key] as string);
      else if (item?.type === "rightwrong" && (key === "r" || key === "w"))
        h.record(key.toUpperCase());
      else if (key === " " || key === "-") h.record(BLANK);
      else if (key === "x") h.markAbsent();
      else if (key === "z" || key === "backspace") h.undoLast();
      else if (key === "arrowright" || key === "arrowdown") h.step(1);
      else if (key === "arrowleft" || key === "arrowup") h.step(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item]);

  // Keep the current chip in view in the strip.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the position changes
  useEffect(() => {
    const el = stripRef.current?.querySelector('[aria-current="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
  }, [pos]);

  if (!item || !student) return null;
  const current = values.get(k(student.id, item.id));
  const isAbsent = absent.has(student.id);
  const verdict = (sid: string, it = item) => {
    if (absent.has(sid)) return "absent";
    const v = values.get(k(sid, it.id));
    if (v === undefined) return "empty";
    return itemPoints(it, v) ? "right" : "wrong";
  };

  return (
    <>
      <TopBar
        title={a.title}
        sub={t(mode === "question" ? "entry.byQuestion" : "entry.byStudent")}
        back={`/class/${a.classId}`}
        actions={
          <button
            type="button"
            className="icon-btn"
            onClick={() => go(`/test/${a.id}/grid`)}
            aria-label={t("entry.grid")}
          >
            <Icon name="grid" />
          </button>
        }
      />
      <main className="entry">
        <div className="entry__head">
          <div className="entry__q">
            {mode === "question" ? (
              <>
                <strong>
                  {t("entry.question", { q: pos.q + 1, n: items.length })}
                  {item.type === "choice" && item.key ? (
                    <span className="muted small"> · {t("entry.key", { key: item.key })}</span>
                  ) : null}
                </strong>
                <span className="muted small">
                  {item.domain || t("entry.noDomain")} ·{" "}
                  {t("entry.studentOf", { s: pos.s + 1, n: students.length })}
                </span>
              </>
            ) : (
              <>
                <strong>{t("entry.question", { q: pos.q + 1, n: items.length })}</strong>
                <span className="muted small">
                  {item.domain || t("entry.noDomain")} ·{" "}
                  {t("entry.studentOf", { s: pos.s + 1, n: students.length })}
                </span>
              </>
            )}
          </div>
          <fieldset className="seg" aria-label={t("entry.order")}>
            <button
              type="button"
              aria-pressed={mode === "question"}
              onClick={() => setMode("question")}
            >
              {t("entry.modeQ")}
            </button>
            <button
              type="button"
              aria-pressed={mode === "student"}
              onClick={() => setMode("student")}
            >
              {t("entry.modeS")}
            </button>
          </fieldset>
        </div>
        <div
          className="entry__progress"
          role="progressbar"
          aria-label={t("entry.progress")}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={entered}
        >
          <span style={{ width: `${(entered / total) * 100}%` }} />
        </div>

        <div className="stack">
          <div className={`who${isAbsent ? " who--absent" : ""}`} data-testid="who">
            <span className="who__roll">{student.roll}</span>
            <div style={{ minWidth: 0 }}>
              <div className="who__name">{student.name}</div>
              <div className="who__state">
                {isAbsent
                  ? t("entry.absent")
                  : current === undefined
                    ? t("entry.notEntered")
                    : current === BLANK
                      ? t("entry.blank")
                      : t("entry.answered", {
                          v:
                            current === "R"
                              ? t("entry.right")
                              : current === "W"
                                ? t("entry.wrong")
                                : current,
                        })}
              </div>
            </div>
          </div>

          {done ? (
            <div className="notice notice--ok" role="status">
              <strong>{t("entry.allDone")}</strong>{" "}
              <button type="button" className="btn btn--sm" onClick={() => go(`/test/${a.id}`)}>
                {t("test.results")}
              </button>
            </div>
          ) : null}

          <fieldset
            className="strip"
            ref={stripRef}
            aria-label={mode === "question" ? t("entry.stripStudents") : t("entry.stripQuestions")}
          >
            {mode === "question"
              ? students.map((st, i) => {
                  const v = verdict(st.id);
                  const val = absent.has(st.id)
                    ? t("entry.absentShort")
                    : (values.get(k(st.id, item.id)) ?? "·");
                  return (
                    <button
                      key={st.id}
                      type="button"
                      aria-current={i === pos.s}
                      onClick={() => setPos({ q: pos.q, s: i })}
                      aria-label={`${st.roll} ${st.name}: ${val}`}
                    >
                      <span className="num muted">{st.roll}</span>
                      <span className={`v v--${v}`}>{val}</span>
                    </button>
                  );
                })
              : items.map((it, i) => {
                  const v = verdict(student.id, it);
                  const val = isAbsent
                    ? t("entry.absentShort")
                    : (values.get(k(student.id, it.id)) ?? "·");
                  return (
                    <button
                      key={it.id}
                      type="button"
                      aria-current={i === pos.q}
                      onClick={() => setPos({ q: i, s: pos.s })}
                      aria-label={`${it.label}: ${val}`}
                    >
                      <span className="num muted">{it.label}</span>
                      <span className={`v v--${v}`}>{val}</span>
                    </button>
                  );
                })}
          </fieldset>
        </div>

        <div className="stack" style={{ marginTop: "auto" }}>
          <fieldset
            className={item.type === "choice" ? "pad" : "pad pad--2"}
            aria-label={t("entry.answerFor", { name: student.name })}
          >
            {item.type === "choice" ? (
              CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="key"
                  aria-pressed={current === c}
                  onClick={() => record(c)}
                >
                  {c}
                </button>
              ))
            ) : (
              <>
                <button
                  type="button"
                  className="key key--right"
                  aria-pressed={current === "R"}
                  onClick={() => record("R")}
                >
                  ✓<small>{t("entry.right")}</small>
                </button>
                <button
                  type="button"
                  className="key key--wrong"
                  aria-pressed={current === "W"}
                  onClick={() => record("W")}
                >
                  ✗<small>{t("entry.wrong")}</small>
                </button>
              </>
            )}
            <button
              type="button"
              className="key key--wide"
              aria-pressed={current === BLANK}
              onClick={() => record(BLANK)}
            >
              {t("entry.blank")}
            </button>
            <button
              type="button"
              className="key key--wide"
              aria-pressed={isAbsent}
              onClick={markAbsent}
            >
              {isAbsent ? t("entry.markPresent") : t("entry.markAbsent")}
            </button>
          </fieldset>
          <div className="entry__tools">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => step(-1)}
              aria-label={t("entry.prev")}
            >
              <Icon name="prev" />
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={undoLast}
              disabled={undo.length === 0}
            >
              <Icon name="undo" />
              {t("entry.undo")}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => step(1)}
              aria-label={t("entry.next")}
            >
              <Icon name="next" />
            </button>
          </div>
          <p className="small muted no-print">{t("entry.saved")}</p>
        </div>
        {announce}
      </main>
    </>
  );
}

function RubricEntry({
  a,
  data,
  setData,
  start,
}: {
  a: RubricAssessment;
  data: EntryData;
  setData: SetEntryData;
  start?: string | undefined;
}) {
  const { t, go } = useApp();
  const { students, values, absent, notes } = data;
  const firstOpen = students.findIndex(
    (st) => !absent.has(st.id) && a.items.some((c) => !values.has(k(st.id, c.id))),
  );
  const [s, setS] = useState(() => {
    if (start) {
      const i = students.findIndex((x) => x.id === start.split("~")[0]);
      if (i >= 0) return i;
    }
    return Math.max(0, firstOpen);
  });
  const [undo, setUndo] = useState<Undo[]>([]);
  const [announce, say] = useAnnounce();
  const student = students[s] as Student;
  const [note, setNoteText] = useState(notes.get(student.id) ?? "");
  useEffect(() => setNoteText(notes.get(student.id) ?? ""), [student.id, notes]);
  const isAbsent = absent.has(student.id);
  const nextOpen = a.items.findIndex((c) => !values.has(k(student.id, c.id)));
  const scored = a.items.filter((c) => values.has(k(student.id, c.id))).length;
  const finished = students.every(
    (st) => absent.has(st.id) || a.items.every((c) => values.has(k(st.id, c.id))),
  );

  const choose = async (itemId: string, score: number) => {
    const key = k(student.id, itemId);
    const before = values.get(key);
    const nextValues = new Map(values);
    nextValues.set(key, String(score));
    const nextAbsent = new Set(absent);
    nextAbsent.delete(student.id);
    setData({ ...data, values: nextValues, absent: nextAbsent });
    setUndo((u) => [
      ...u.slice(-199),
      { kind: "answer", studentId: student.id, itemId, prev: before, q: 0, s },
    ]);
    const c = a.items.find((x) => x.id === itemId);
    say(`${c?.label}: ${c?.levels.find((l) => l.score === score)?.label ?? score}`);
    await setAnswer(a.id, student.id, itemId, String(score));
    // Move focus to the next unscored criterion.
    const idx = a.items.findIndex((x) => x.id === itemId);
    const following = a.items.slice(idx + 1).find((x) => !nextValues.has(k(student.id, x.id)));
    if (following)
      document
        .getElementById(`crit-${following.id}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    else document.getElementById("rubric-next")?.focus();
  };

  const undoLast = async () => {
    const last = undo[undo.length - 1];
    if (!last) return;
    setUndo((u) => u.slice(0, -1));
    setS(last.s);
    if (last.kind === "answer") {
      const nextValues = new Map(values);
      const key = k(last.studentId, last.itemId);
      if (last.prev === undefined) nextValues.delete(key);
      else nextValues.set(key, last.prev as string);
      setData({ ...data, values: nextValues });
      await setAnswer(a.id, last.studentId, last.itemId, last.prev as string | undefined);
    } else {
      const nextAbsent = new Set(absent);
      if (last.prev) nextAbsent.add(last.studentId);
      else nextAbsent.delete(last.studentId);
      setData({ ...data, absent: nextAbsent });
      await setAbsent(a.id, last.studentId, Boolean(last.prev));
    }
    say(t("entry.undone"));
  };

  const toggleAbsent = async () => {
    const now = !isAbsent;
    const nextAbsent = new Set(absent);
    if (now) nextAbsent.add(student.id);
    else nextAbsent.delete(student.id);
    setData({ ...data, absent: nextAbsent });
    setUndo((u) => [
      ...u,
      { kind: "absent", studentId: student.id, itemId: "", prev: !now, q: 0, s },
    ]);
    await setAbsent(a.id, student.id, now);
    if (now && s < students.length - 1) setS(s + 1);
  };

  const saveNote = async () => {
    if ((notes.get(student.id) ?? "") === note) return;
    const nextNotes = new Map(notes);
    nextNotes.set(student.id, note);
    setData({ ...data, notes: nextNotes });
    await setNote(a.id, student.id, note);
  };

  const move = async (dir: 1 | -1) => {
    await saveNote();
    setS((x) => Math.max(0, Math.min(students.length - 1, x + dir)));
    window.scrollTo(0, 0);
  };

  return (
    <>
      <TopBar
        title={a.title}
        sub={t("entry.rubric")}
        back={`/class/${a.classId}`}
        actions={
          <button
            type="button"
            className="icon-btn"
            onClick={() => go(`/test/${a.id}/grid`)}
            aria-label={t("entry.grid")}
          >
            <Icon name="grid" />
          </button>
        }
      />
      <main className="k-main">
        <div className="spread">
          <span className="muted small">
            {t("entry.studentOf", { s: s + 1, n: students.length })}
          </span>
          <span className="chip">
            {t("entry.criteriaDone", { done: scored, n: a.items.length })}
          </span>
        </div>
        <div className={`who${isAbsent ? " who--absent" : ""}`} data-testid="who">
          <span className="who__roll">{student.roll}</span>
          <div style={{ minWidth: 0 }}>
            <div className="who__name">{student.name}</div>
            <div className="who__state">{isAbsent ? t("entry.absent") : null}</div>
          </div>
        </div>
        {finished ? (
          <div className="notice notice--ok" role="status">
            <strong>{t("entry.allDone")}</strong>{" "}
            <button type="button" className="btn btn--sm" onClick={() => go(`/test/${a.id}`)}>
              {t("test.results")}
            </button>
          </div>
        ) : null}
        {!isAbsent
          ? a.items.map((c, ci) => {
              const v = values.get(k(student.id, c.id));
              return (
                <fieldset
                  key={c.id}
                  id={`crit-${c.id}`}
                  className="crit"
                  data-current={ci === nextOpen}
                  aria-labelledby={`crit-h-${c.id}`}
                  style={{ margin: 0 }}
                >
                  <div className="spread">
                    <h3 id={`crit-h-${c.id}`}>{c.label}</h3>
                    {c.domain ? <span className="chip">{c.domain}</span> : null}
                  </div>
                  <div className="levels">
                    {c.levels.map((l) => (
                      <button
                        key={l.score}
                        type="button"
                        className="level"
                        aria-pressed={v === String(l.score)}
                        onClick={() => choose(c.id, l.score)}
                      >
                        <strong>
                          <span className="num">{l.score}</span> · {l.label}
                        </strong>
                        {l.descriptor ? <span>{l.descriptor}</span> : null}
                      </button>
                    ))}
                  </div>
                </fieldset>
              );
            })
          : null}
        <div className="field">
          <label htmlFor="note">{t("entry.note")}</label>
          <textarea
            id="note"
            className="textarea"
            style={{ minHeight: 72 }}
            maxLength={280}
            value={note}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={saveNote}
            placeholder={t("entry.notePlaceholder")}
          />
        </div>
        <div className="entry__tools">
          <button type="button" className="btn btn--sm" onClick={() => move(-1)} disabled={s === 0}>
            <Icon name="prev" />
            {t("entry.prevStudent")}
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={undoLast}
            disabled={undo.length === 0}
          >
            <Icon name="undo" />
            {t("entry.undo")}
          </button>
          <button type="button" className="btn btn--sm" onClick={toggleAbsent}>
            {isAbsent ? t("entry.markPresent") : t("entry.markAbsent")}
          </button>
        </div>
        <button
          id="rubric-next"
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => move(1)}
          disabled={s === students.length - 1}
        >
          {t("entry.nextStudent")}
          <Icon name="next" />
        </button>
        <p className="small muted">{t("entry.saved")}</p>
        {announce}
      </main>
    </>
  );
}
