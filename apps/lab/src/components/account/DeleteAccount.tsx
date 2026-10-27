"use client";

import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./Account.module.css";

const PHRASE = "delete my account";

/** Type-to-confirm account deletion. Calls the lab_delete_my_account function, then signs out. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (text.trim().toLowerCase() !== PHRASE) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: failed } = await supabase.rpc("lab_delete_my_account");
    if (failed) {
      setBusy(false);
      setError(
        failed.code === "PGRST202"
          ? "Self-service deletion is not switched on yet. Raise a ticket and we will delete it for you."
          : failed.message,
      );
      return;
    }
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  if (!open) {
    return (
      <div>
        <button type="button" className={styles.btnGhost} onClick={() => setOpen(true)}>
          Delete my account
        </button>
      </div>
    );
  }

  return (
    <form className={styles.section} onSubmit={confirm}>
      <p className={styles.muted}>
        This cannot be undone. Type <strong>{PHRASE}</strong> to confirm.
      </p>
      <label className={styles.field}>
        <span>Confirmation</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          placeholder={PHRASE}
        />
      </label>
      <div className={styles.row}>
        <button
          type="submit"
          className={styles.btn}
          disabled={busy || text.trim().toLowerCase() !== PHRASE}
        >
          {busy ? "Deleting" : "Delete everything"}
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error ? (
        <p className={styles.note} data-kind="error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
