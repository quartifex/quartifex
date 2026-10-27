import styles from "@/components/account/Account.module.css";
import { ProfileForm } from "@/components/account/ProfileForm";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) return null;
  return (
    <>
      <h1 className={styles.h1}>Profile</h1>
      <ProfileForm
        userId={session.user.id}
        email={session.user.email ?? ""}
        displayName={session.profile?.display_name ?? ""}
        avatarUrl={session.profile?.avatar_url ?? null}
      />
    </>
  );
}
