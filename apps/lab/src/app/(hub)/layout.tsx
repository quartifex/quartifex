import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./layout.module.css";

// The hub chrome: skip link, header with the theme toggle, footer. The bare scene route
// used by demos and contact sheets renders without it.
export default function HubLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Quartifex <span>Lab</span>
        </Link>
        <ThemeToggle />
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <span>Quartifex</span>
        <span>Open source, MIT</span>
      </footer>
    </>
  );
}
