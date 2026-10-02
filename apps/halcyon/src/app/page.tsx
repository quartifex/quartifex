// halcyon (S08): Accessibility proof. One launch story in three modes (full, reduced,
// static) with a live switch, plus the axe and Lighthouse results from CI. Planned address:
// halcyon.quartifex.com.
import { Quiet, TheObject } from "@/components/Chapters";
import { Hero } from "@/components/Hero";
import { ModeSwitch, MotionRoot, Rail } from "@/components/Motion";
import { Proof } from "@/components/Proof";
import { Sunrise } from "@/components/Sunrise";
import styles from "./page.module.css";

export default function Home() {
  return (
    <MotionRoot>
      <a className="skip-link" href="#sunrise">
        Skip the opening scene
      </a>
      <header className={styles.bar}>
        <a href="/" className={styles.mark} aria-label="halcyon, home">
          halcyon
        </a>
        <ModeSwitch />
      </header>
      <Rail />
      <main>
        <Hero />
        <Sunrise />
        <TheObject />
        <Quiet />
        <Proof />
      </main>
      <footer className={styles.footer}>
        <p className="label" data-testid="honest-label">
          Open-source demo
        </p>
        <p className={styles.fiction}>
          Morrow is a fictional product, invented for this demo. There is nothing to buy.
        </p>
        <ul className={styles.provenance} aria-label="Provenance">
          <li>
            Dawn sequence: concept visual, drawn in code (procedural SVG frames encoded by rushes at
            build time). Not a photograph.
          </li>
          <li>Light shafts: drawn live in the browser by @quartifex/volumetric, full mode only.</li>
          <li>Lamp: an illustration drawn in code.</li>
          <li>
            Audit figures: produced by axe-core and Lighthouse against this page, published by CI.
          </li>
          <li>Icon: from the Quartifex icon set, drawn in-house.</li>
          <li>No photographs, video, models, datasets or sound are used.</li>
        </ul>
        <p className={styles.small}>
          Built with @quartifex/stillness, reel, heft and volumetric. Open source, MIT. Quartifex ·{" "}
          <a href="https://lab.quartifex.com">lab.quartifex.com</a>
        </p>
      </footer>
    </MotionRoot>
  );
}
