// reelhouse (S03): Docs & playground. Docs and a live playground for reel and rushes: drop
// a video, preview tiers, see the estimated weight against a budget. Planned address:
// reelhouse.quartifex.com.
import { Docs } from "@/components/Docs";
import { Hero } from "@/components/Hero";
import { Playground } from "@/components/Playground";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#playground">
        Skip to the playground
      </a>
      <header className={styles.bar}>
        <a href="/" className={styles.mark} aria-label="reelhouse, home">
          reelhouse
        </a>
        <nav aria-label="Sections">
          <ul className={styles.nav}>
            <li>
              <a href="#playground">Playground</a>
            </li>
            <li>
              <a href="#docs">Docs</a>
            </li>
            <li>
              <a href="https://github.com/quartifex/quartifex">Source</a>
            </li>
          </ul>
        </nav>
      </header>
      <main>
        <Hero />
        <Playground />
        <Docs />
      </main>
      <footer className={styles.footer}>
        <p className="label" data-testid="honest-label">
          Open-source demo
        </p>
        <ul className={styles.provenance} aria-label="Provenance">
          <li>
            Hero: concept visual, a lens iris drawn in code (procedural SVG frames encoded by rushes
            at build time). Not a photograph or film footage.
          </li>
          <li>Playground sample: the same hero sequence, re-encoded in your browser.</li>
          <li>
            Your clip: read and encoded in this tab only. Nothing is uploaded, stored or sent.
          </li>
          <li>Icon: from the Quartifex icon set, drawn in-house.</li>
          <li>No photographs, video, models, datasets or sound are shipped with this page.</li>
        </ul>
        <p className={styles.small}>
          Open source, MIT. Quartifex · <a href="https://lab.quartifex.com">lab.quartifex.com</a>
        </p>
      </footer>
    </>
  );
}
