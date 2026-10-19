"use client";
// The top bar on wide screens, above the top-level screens: search across every
// class, a quick "New test", and who is using this phone.
import { useLiveQuery } from "dexie-react-hooks";
import { useId, useState } from "react";
import { db, isDemo } from "../lib/db";
import { useApp } from "./context";
import { useProfile } from "./data";
import { Icon } from "./ui";

export function DeskBar() {
  const { t, go } = useApp();
  const profile = useProfile();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const id = useId();
  const needle = q.trim().toLocaleLowerCase();
  const hits = useLiveQuery(async () => {
    if (needle.length < 2) return [];
    const [students, classes] = await Promise.all([
      db().students.toArray(),
      db().classes.toArray(),
    ]);
    const cls = new Map(classes.map((c) => [c.id, c]));
    return students
      .filter((s) => s.name.toLocaleLowerCase().includes(needle))
      .slice(0, 7)
      .map((s) => ({ s, c: cls.get(s.classId) }));
  }, [needle]);
  const firstClass = useLiveQuery(
    async () => (await db().classes.toCollection().first()) ?? null,
    [],
  );
  const name = profile?.name?.trim();
  const initials = name
    ? name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : null;

  return (
    <header className="deskbar">
      <search className="deskbar__search">
        <Icon name="search" />
        <input
          type="search"
          aria-label={t("desk.search")}
          placeholder={t("desk.search")}
          value={q}
          aria-controls={open && hits?.length ? id : undefined}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
        />
        {open && hits?.length ? (
          <ul id={id} className="deskbar__results">
            {hits.map(({ s, c }) => (
              <li key={s.id}>
                <button type="button" onMouseDown={() => go(`/student/${s.id}`)}>
                  <span className="roll-dot num">{s.roll.padStart(2, "0")}</span>
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {c ? t("class.label", { grade: c.grade, section: c.section }) : ""}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </search>
      <nav className="deskbar__pills" aria-label={t("desk.quick")}>
        <button
          type="button"
          className="pillbtn pillbtn--on"
          onClick={() => go(firstClass ? `/class/${firstClass.id}/new` : "/new-class")}
        >
          <Icon name="exam" />
          {t("class.newTest")}
        </button>
        <button type="button" className="pillbtn" onClick={() => go("/classes")}>
          <Icon name="clipboard" />
          {t("desk.mark")}
        </button>
        <button
          type="button"
          className="pillbtn"
          onClick={() => go(firstClass ? `/class/${firstClass.id}/reports` : "/classes")}
        >
          <Icon name="print" />
          {t("reports.title")}
        </button>
      </nav>
      <button type="button" className="deskbar__me" onClick={() => go("/more/profile")}>
        <span className="deskbar__avatar" aria-hidden="true">
          {initials ?? <Icon name="user" />}
        </span>
        <span>{name || (isDemo() ? t("desk.demoTeacher") : t("more.addName"))}</span>
      </button>
    </header>
  );
}
