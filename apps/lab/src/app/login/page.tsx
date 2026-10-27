import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { AuthForm } from "@/components/shell/AuthForm";
import { KitRoot } from "@/components/shell/KitRoot";
import { byKind, getIconSvg } from "@/lib/catalog";
import { getSession } from "@/lib/supabase/server";
import styles from "./login.module.css";

export const metadata = { title: "Sign in" };

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next, error } = await searchParams;
  const safe = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getSession()) redirect(safe);

  const backdrop = [...byKind("lib"), ...byKind("site")].slice(0, 18);
  return (
    <div className={styles.page}>
      <KitRoot />
      <ul className={styles.backdrop} aria-hidden="true">
        {backdrop.map((item) => (
          <li
            key={item.id}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from assets/icons in this repo
            dangerouslySetInnerHTML={{ __html: getIconSvg(item) }}
          />
        ))}
      </ul>
      <main className={styles.brand}>
        <Logo height={40} label="Quartifex Lab, home" />
        <div className={styles.panel}>
          {error ? (
            <p className={styles.error} role="alert">
              That sign-in link did not work. Please try again.
            </p>
          ) : null}
          <AuthForm next={safe} />
        </div>
      </main>
    </div>
  );
}
