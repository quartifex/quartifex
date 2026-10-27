import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { REPO } from "@/lib/catalog";
import styles from "./LabFooter.module.css";

const SITE = "https://quartifex.com";

/** The Lab's own footer: shorter than the studio's, same hairline and mono-label voice. */
export function LabFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <Logo height={26} label="Quartifex Lab, home" />
          <p>Motion, 3D and scroll tools from the studio. Browse free, sign in to save.</p>
          <a className={styles.mail} href="mailto:lab@quartifex.com">
            lab@quartifex.com
          </a>
        </div>
        <nav className={styles.col} aria-label="Lab">
          <span className={styles.label}>Lab</span>
          <Link href="/">Browse</Link>
          <Link href="/account/saved">Saved</Link>
          <Link href="/account/tickets/new">Raise a ticket</Link>
          <Link href="/account">Account</Link>
        </nav>
        <nav className={styles.col} aria-label="Studio">
          <span className={styles.label}>Studio</span>
          <a href={SITE}>Quartifex</a>
          <a href={`${SITE}/work`}>Work</a>
          <a href={`${SITE}/studio`}>Studio</a>
          <a href={`${SITE}/contact`}>Book a call</a>
        </nav>
        <nav className={styles.col} aria-label="Legal">
          <span className={styles.label}>Legal</span>
          <a href={`${SITE}/privacy`}>Privacy</a>
          <a href={`${SITE}/terms`}>Terms</a>
        </nav>
      </div>
      <p className={styles.credits} data-testid="built-on">
        Built on <a href="https://threejs.org/">Three.js</a>, <a href="https://gsap.com/">GSAP</a>{" "}
        and <a href="https://pmnd.rs/">Poimandres</a>&apos;{" "}
        <a href="https://github.com/pmndrs/react-three-fiber">react-three-fiber</a>,{" "}
        <a href="https://github.com/pmndrs/drei">drei</a> and{" "}
        <a href="https://github.com/pmndrs/detect-gpu">detect-gpu</a>. Source on{" "}
        <a href={REPO} data-testid="repo-link">
          GitHub
        </a>
        .
      </p>
      <div className={styles.base}>
        <span>© {year} Quartifex</span>
        <span className={styles.status}>
          <i aria-hidden="true" />
          Lab is live
        </span>
      </div>
    </footer>
  );
}
