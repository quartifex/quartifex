import type { ReactNode } from "react";
import { AuthProvider } from "@/components/shell/AuthProvider";
import { KitRoot } from "@/components/shell/KitRoot";
import { LabFooter } from "@/components/shell/LabFooter";
import { LabTabBar } from "@/components/shell/LabTabBar";
import styles from "@/components/shell/Shell.module.css";
import { Sidebar } from "@/components/shell/Sidebar";
import { createClient, getSession } from "@/lib/supabase/server";

// The hub chrome: a sidebar shell with catalog sections, account links and the user card.
// The bare scene route used by demos and contact sheets renders without it.
export default async function HubLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  let favorites: string[] = [];
  if (session) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("favorites")
      .select("item_id")
      .eq("user_id", session.user.id);
    favorites = (data ?? []).map((row: { item_id: string }) => row.item_id);
  }

  return (
    <AuthProvider userId={session?.user.id ?? null} initialFavorites={favorites}>
      <KitRoot />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className={styles.shell}>
        <Sidebar
          user={session ? { email: session.user.email ?? null } : null}
          profile={session?.profile ?? null}
        />
        <main id="main" className={styles.main}>
          {children}
          <LabFooter />
        </main>
      </div>
      <LabTabBar />
    </AuthProvider>
  );
}
