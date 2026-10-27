"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./Account.module.css";

const CATEGORIES = ["question", "bug", "request", "account", "other"] as const;

export function TicketForm({
  userId,
  defaultCategory,
  items,
}: {
  userId: string;
  defaultCategory: string;
  items: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [itemId, setItemId] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("tickets")
      .insert({ user_id: userId, subject: subject.trim(), category, item_id: itemId || null })
      .select("id")
      .single();
    if (err || !data) {
      setBusy(false);
      return setError(err?.message ?? "Could not create the ticket.");
    }
    const msg = await supabase
      .from("ticket_messages")
      .insert({ ticket_id: data.id, author_id: userId, body: body.trim() });
    setBusy(false);
    if (msg.error) return setError(msg.error.message);
    router.push(`/account/tickets/${data.id}`);
  }

  return (
    <form className={styles.section} onSubmit={submit}>
      <label className={styles.field}>
        <span>Subject</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={3}
          maxLength={140}
        />
      </label>
      <label className={styles.field}>
        <span>Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>Related item (optional)</span>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">None</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>Message</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={5000}
        />
      </label>
      <div className={styles.row}>
        <button className={styles.btn} disabled={busy} type="submit">
          Send ticket
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
