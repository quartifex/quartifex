import type { Metadata } from "next";
import { DM_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";
import styles from "./layout.module.css";

const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
  title: { default: "Quartifex Lab", template: "%s · Quartifex Lab" },
  description:
    "Open-source libraries, proof sites and small experiments for cinematic, scroll-driven web launches.",
};

// Apply a saved theme before first paint. With no saved choice the tokens follow
// the OS preference on their own, so nothing is set.
const themeScript = `try{var t=localStorage.getItem("qx-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={dmMono.variable} suppressHydrationWarning>
      <body>
        <Script id="qx-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
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
      </body>
    </html>
  );
}
