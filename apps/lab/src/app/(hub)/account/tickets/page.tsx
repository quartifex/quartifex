import Link from "next/link";
import styles from "@/components/account/Account.module.css";
import { createClient, getSession } from "@/lib/supabase/server";

export const metadata = { title: "Tickets" };

type Row = { id: string; subject: string; status: string; category: string; updated_at: string };

export default async function TicketsPage() {
  if (!(await getSession())) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("id, subject, status, category, updated_at")
    .order("updated_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  return (
    <>
      <div
        className={styles.row}
        style={{ justifyContent: "space-between", marginBottom: "1.5rem" }}
      >
        <h1 className={styles.h1} style={{ margin: 0 }}>
          Tickets
        </h1>
        <Link href="/account/tickets/new" className={styles.btn}>
          Raise a ticket
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className={styles.muted}>No tickets yet.</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((t) => (
            <li key={t.id}>
              <Link href={`/account/tickets/${t.id}`} className={styles.listItem}>
                <span>{t.subject}</span>
                <span className={styles.row}>
                  <span className={styles.pill}>{t.category}</span>
                  <span className={styles.pill}>{t.status}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
