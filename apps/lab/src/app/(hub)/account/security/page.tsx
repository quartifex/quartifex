import styles from "@/components/account/Account.module.css";
import { SecurityPanel } from "@/components/account/SecurityPanel";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Security" };

export default async function SecurityPage() {
  const session = await getSession();
  if (!session) return null;
  const providers = (session.user.identities ?? []).map((i) => i.provider);
  return (
    <>
      <h1 className={styles.h1}>Security</h1>
      <SecurityPanel providers={providers.length ? providers : ["email"]} />
    </>
  );
}
