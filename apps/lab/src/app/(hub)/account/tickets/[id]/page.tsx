import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/account/Account.module.css";
import { ReplyForm } from "@/components/account/ReplyForm";
import { createClient, getSession } from "@/lib/supabase/server";

export const metadata = { title: "Ticket" };

type Message = { id: string; body: string; is_staff: boolean; created_at: string };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, subject, status, category")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) notFound();
  const { data } = await supabase
    .from("ticket_messages")
    .select("id, body, is_staff, created_at")
    .eq("ticket_id", id)
    .order("created_at");
  const messages = (data ?? []) as Message[];
  const closed = ticket.status === "closed";

  return (
    <>
      <p className={styles.muted}>
        <Link href="/account/tickets">← All tickets</Link>
      </p>
      <h1 className={styles.h1}>{ticket.subject}</h1>
      <p className={styles.row} style={{ marginBottom: "1.5rem" }}>
        <span className={styles.pill}>{ticket.category}</span>
        <span className={styles.pill}>{ticket.status}</span>
      </p>
      <ul className={styles.thread}>
        {messages.map((m) => (
          <li key={m.id} className={styles.msg} data-staff={m.is_staff}>
            <small>
              {m.is_staff ? "Quartifex" : "You"} · {new Date(m.created_at).toLocaleString("en-GB")}
            </small>
            {m.body}
          </li>
        ))}
      </ul>
      {closed ? (
        <p className={styles.muted}>
          This ticket is closed. Raise a new one if you need more help.
        </p>
      ) : (
        <ReplyForm ticketId={ticket.id} userId={session.user.id} />
      )}
    </>
  );
}
