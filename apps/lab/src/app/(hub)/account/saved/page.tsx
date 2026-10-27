import Link from "next/link";
import styles from "@/components/account/Account.module.css";
import { Collections, type CollectionView } from "@/components/account/Collections";
import { ItemCard } from "@/components/ItemCard";
import { getById } from "@/lib/catalog";
import { createClient, getSession } from "@/lib/supabase/server";

export const metadata = { title: "Saved" };

export default async function SavedPage() {
  const session = await getSession();
  if (!session) return null;
  const supabase = await createClient();
  const [favs, cols, links] = await Promise.all([
    supabase.from("favorites").select("item_id").order("created_at", { ascending: false }),
    supabase.from("collections").select("id, name").order("created_at"),
    supabase.from("collection_items").select("collection_id, item_id"),
  ]);

  const items = (favs.data ?? [])
    .map((f: { item_id: string }) => getById(f.item_id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));
  const nameOf = (id: string) => getById(id)?.name ?? id;
  const collections: CollectionView[] = (cols.data ?? []).map(
    (c: { id: string; name: string }) => ({
      id: c.id,
      name: c.name,
      items: (links.data ?? [])
        .filter((l: { collection_id: string }) => l.collection_id === c.id)
        .map((l: { item_id: string }) => ({ id: l.item_id, name: nameOf(l.item_id) })),
    }),
  );

  return (
    <>
      <h1 className={styles.h1}>Saved</h1>
      {items.length === 0 ? (
        <p className={styles.muted}>
          Nothing saved yet. Tap the heart on any item in the <Link href="/">catalog</Link>.
        </p>
      ) : (
        <ul className={styles.grid}>
          {items.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} />
            </li>
          ))}
        </ul>
      )}
      <Collections
        userId={session.user.id}
        collections={collections}
        saved={items.map((i) => ({ id: i.id, name: i.name }))}
      />
    </>
  );
}
