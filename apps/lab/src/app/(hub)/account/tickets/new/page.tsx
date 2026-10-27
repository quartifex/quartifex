import styles from "@/components/account/Account.module.css";
import { TicketForm } from "@/components/account/TicketForm";
import { getCatalog } from "@/lib/catalog";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Raise a ticket" };

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { category } = await searchParams;
  return (
    <>
      <h1 className={styles.h1}>Raise a ticket</h1>
      <TicketForm
        userId={session.user.id}
        defaultCategory={category ?? "question"}
        items={getCatalog().map((i) => ({ id: i.id, name: i.name }))}
      />
    </>
  );
}
