"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./Account.module.css";

export function ReplyForm({ ticketId, userId }: { ticketId: string; userId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error: err } = await createClient()
      .from("ticket_messages")
      .insert({ ticket_id: ticketId, author_id: userId, body: body.trim() });
    setBusy(false);
    setError(err?.message ?? null);
    if (!err) {
      setBody("");
      router.refresh();
    }
  }

  return (
    <form className={styles.section} onSubmit={submit}>
      <label className={styles.field}>
        <span>Reply</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={5000}
        />
      </label>
      <div className={styles.row}>
        <button className={styles.btn} disabled={busy} type="submit">
          Send reply
        </button>
        {error ? (
          <p className={styles.note} data-kind="error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
