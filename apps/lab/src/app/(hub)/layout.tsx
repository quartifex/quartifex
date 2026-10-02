import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { REPO } from "@/lib/catalog";
import styles from "./layout.module.css";

// The open-source projects our libraries are built on, credited where visitors see them.
const BUILT_ON = [
  { name: "Three.js", href: "https://github.com/mrdoob/three.js" },
  { name: "GSAP", href: "https://gsap.com" },
  { name: "react-three-fiber", href: "https://github.com/pmndrs/react-three-fiber" },
  { name: "drei", href: "https://github.com/pmndrs/drei" },
  { name: "detect-gpu", href: "https://github.com/pmndrs/detect-gpu" },
];

// The hub chrome: skip link, header with the repository link and theme toggle, footer with
// the credits. The bare scene route used by demos and contact sheets renders without it.
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
        <nav className={styles.nav} aria-label="Site">
          <Link href="/lab" className={styles.navLink}>
            Lab gallery
          </Link>
          <a href={REPO} className={styles.repo} data-testid="repo-link">
            View on GitHub
          </a>
          <ThemeToggle />
        </nav>
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p className={styles.credits} data-testid="built-on">
          Built on{" "}
          {BUILT_ON.map((project, i) => (
            <span key={project.name}>
              <a href={project.href}>{project.name}</a>
              {i < BUILT_ON.length - 1 ? ", " : ""}
              {project.name === "detect-gpu" ? (
                <>
                  {" "}
                  (the last three by <a href="https://pmnd.rs/">Poimandres</a>)
                </>
              ) : null}
            </span>
          ))}
          .
        </p>
        <p className={styles.legal}>
          <span>Quartifex</span>
          <a href={REPO}>Open source, MIT</a>
        </p>
      </footer>
    </>
  );
}
