"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./Account.module.css";

export type CollectionView = {
  id: string;
  name: string;
  items: { id: string; name: string }[];
};

type Props = {
  userId: string;
  collections: CollectionView[];
  saved: { id: string; name: string }[];
};

/** Create, fill and delete collections of saved items. */
export function Collections({ userId, collections, saved }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(job: PromiseLike<{ error: { message: string } | null }>) {
    const { error: err } = await job;
    setError(err?.message ?? null);
    if (!err) router.refresh();
  }

  function create(event: FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    setName("");
    run(createClient().from("collections").insert({ user_id: userId, name: value }));
  }

  return (
    <section className={styles.section}>
      <h2>Collections</h2>
      <form className={styles.row} onSubmit={create}>
        <label className={styles.field} style={{ flex: 1 }}>
          <span>New collection</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </label>
        <button className={styles.btn} type="submit">
          Create
        </button>
      </form>
      {error ? (
        <p className={styles.note} data-kind="error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className={styles.list}>
        {collections.map((c) => {
          const inside = new Set(c.items.map((i) => i.id));
          const addable = saved.filter((s) => !inside.has(s.id));
          return (
            <li key={c.id} className={styles.listItem} style={{ display: "grid" }}>
              <div className={styles.row} style={{ justifyContent: "space-between" }}>
                <strong>{c.name}</strong>
                <button
                  className={styles.btnGhost}
                  type="button"
                  onClick={() => run(createClient().from("collections").delete().eq("id", c.id))}
                >
                  Delete
                </button>
              </div>
              <div className={styles.row}>
                {c.items.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={styles.pill}
                    aria-label={`Remove ${i.name} from ${c.name}`}
                    onClick={() =>
                      run(
                        createClient()
                          .from("collection_items")
                          .delete()
                          .match({ collection_id: c.id, item_id: i.id }),
                      )
                    }
                  >
                    {i.name} ×
                  </button>
                ))}
                {addable.length > 0 ? (
                  <select
                    aria-label={`Add to ${c.name}`}
                    value=""
                    onChange={(e) =>
                      e.target.value &&
                      run(
                        createClient()
                          .from("collection_items")
                          .insert({ collection_id: c.id, item_id: e.target.value }),
                      )
                    }
                  >
                    <option value="">Add saved item…</option>
                    {addable.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
