"use client";

import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./Account.module.css";

type Note = { kind: "ok" | "error"; text: string } | null;

export function SecurityPanel({ providers }: { providers: string[] }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function change(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setNote({ kind: "error", text: "Use at least 8 characters." });
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    setNote(
      error ? { kind: "error", text: error.message } : { kind: "ok", text: "Password updated." },
    );
    if (!error) setPassword("");
  }

  async function signOutEverywhere() {
    setBusy(true);
    await createClient().auth.signOut({ scope: "global" });
    window.location.assign("/login");
  }

  return (
    <>
      <form className={styles.section} onSubmit={change}>
        <h2>{providers.includes("email") ? "Change password" : "Set a password"}</h2>
        <label className={styles.field}>
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className={styles.row}>
          <button className={styles.btn} disabled={busy} type="submit">
            Update password
          </button>
          {note ? (
            <p className={styles.note} data-kind={note.kind} role="status">
              {note.text}
            </p>
          ) : null}
        </div>
      </form>
      <section className={styles.section}>
        <h2>Connected sign-in methods</h2>
        <ul className={styles.list}>
          {providers.map((p) => (
            <li key={p} className={styles.listItem}>
              <span>{p === "email" ? "Email" : p.charAt(0).toUpperCase() + p.slice(1)}</span>
              <span className={styles.pill}>Connected</span>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.section}>
        <h2>Sessions</h2>
        <p className={styles.muted}>Sign out of this and every other device.</p>
        <div>
          <button
            className={styles.btnGhost}
            disabled={busy}
            type="button"
            onClick={signOutEverywhere}
          >
            Sign out everywhere
          </button>
        </div>
      </section>
    </>
  );
}
