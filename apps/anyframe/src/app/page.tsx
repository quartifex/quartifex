// anyframe (S13): Responsive proof. One scene, every screen. Planned address:
// anyframe.quartifex.com.
import { Hero } from "@/components/Hero";
import { Matrix } from "@/components/Matrix";
import { Playground } from "@/components/Playground";
import styles from "./page.module.css";

const LIBRARIES = [
  ["plumb", "steady viewport and live values", "https://lab.quartifex.com/plumb"],
  [
    "safeframe",
    "subject, focal point and copy zone per screen",
    "https://lab.quartifex.com/safeframe",
  ],
  ["resolve", "sequence tier and pixel ratio per screen", "https://lab.quartifex.com/resolve"],
  ["reel", "the scrubbed sequence", "https://lab.quartifex.com/reel"],
  ["contactsheet", "the device matrix and its flags", "https://lab.quartifex.com/contactsheet"],
] as const;

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#screens-title">
        Skip the scene
      </a>
      <main>
        <Hero />
        <Playground />
        <Matrix />
        <section className={styles.how} aria-labelledby="how-title">
          <h2 id="how-title" className={styles.h2}>
            Built with
          </h2>
          <ul className={styles.libs}>
            {LIBRARIES.map(([name, what, href]) => (
              <li key={name}>
                <a href={href}>@quartifex/{name}</a>
                <span>{what}</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            Open source, MIT. The sequence is encoded by rushes at build time; nothing here is a
            video or a photograph.
          </p>
        </section>
      </main>
      <footer className={styles.footer}>
        <p className="label" data-testid="honest-label">
          Open-source demo
        </p>
        <ul className={styles.provenance} aria-label="Provenance">
          <li>
            QUASAR reveal: concept visual, drawn in code (procedural SVG frames encoded by rushes).
            Not an astronomical image.
          </li>
          <li>Icon: from the Quartifex icon set, drawn in-house.</li>
          <li>No photographs, video, models, datasets or sound are used.</li>
        </ul>
        <p className={styles.small}>Quartifex · lab.quartifex.com</p>
      </footer>
    </>
  );
}
