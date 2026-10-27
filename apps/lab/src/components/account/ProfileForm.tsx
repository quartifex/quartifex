"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./Account.module.css";

type Props = { userId: string; email: string; displayName: string; avatarUrl: string | null };

/** Display name and avatar. Avatars live in the `avatars` bucket under the user's own folder. */
export function ProfileForm({ userId, email, displayName, avatarUrl }: Props) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setBusy(false);
    setNote(error ? { kind: "error", text: error.message } : { kind: "ok", text: "Saved." });
    if (!error) router.refresh();
  }

  async function upload(file: File) {
    if (file.size > 2 * 1024 * 1024) return setNote({ kind: "error", text: "Max 2 MB." });
    if (!file.type.startsWith("image/")) return setNote({ kind: "error", text: "Images only." });
    setBusy(true);
    const supabase = createClient();
    const path = `${userId}/avatar-${Date.now()}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (up.error) {
      setBusy(false);
      return setNote({ kind: "error", text: up.error.message });
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    setBusy(false);
    if (error) return setNote({ kind: "error", text: error.message });
    setAvatar(url);
    setNote({ kind: "ok", text: "Avatar updated." });
    router.refresh();
  }

  return (
    <form className={styles.section} onSubmit={save}>
      <div className={styles.row}>
        {avatar ? (
          // biome-ignore lint/performance/noImgElement: user-uploaded avatar from Supabase storage
          <img className={styles.avatarBig} src={avatar} alt="" />
        ) : (
          <span className={styles.avatarBig} aria-hidden="true">
            {(name || email).slice(0, 1).toUpperCase()}
          </span>
        )}
        <label className={styles.btnGhost}>
          Upload avatar
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
      </div>
      <label className={styles.field}>
        <span>Display name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </label>
      <label className={styles.field}>
        <span>Email</span>
        <input value={email} readOnly />
      </label>
      <div className={styles.row}>
        <button className={styles.btn} disabled={busy} type="submit">
          Save changes
        </button>
        {note ? (
          <p className={styles.note} data-kind={note.kind} role="status">
            {note.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
