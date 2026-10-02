// Chapters three and four: the object and its specification. Plain server-rendered content;
// the only motion is the lamp's slow breathing glow, in full mode only (CSS).
import styles from "./Chapters.module.css";

export function TheObject() {
  return (
    <section id="object" className={styles.section} aria-labelledby="object-title">
      <div className={styles.split}>
        <div className={styles.copy}>
          <p className="mono">Chapter three · The object</p>
          <h2 id="object-title" className={styles.h2}>
            One dome, one dial.
          </h2>
          <p className={styles.text}>
            A frosted glass dome on a walnut base. One dial sets the time you want to be awake;
            turning it is the whole interface. No app, no account, no screen to glow at you in the
            dark.
          </p>
        </div>
        <figure className={styles.figure}>
          <svg
            className={styles.lamp}
            viewBox="0 0 320 340"
            role="img"
            aria-label="Illustration: a frosted dome lamp on a walnut base with a single dial, glowing warm."
          >
            <circle className={styles.halo} cx="160" cy="150" r="130" />
            <path className={styles.dome} d="M60 190 A100 100 0 0 1 260 190 Z" />
            <rect className={styles.rim} x="60" y="186" width="200" height="8" rx="4" />
            <rect className={styles.stem} x="153" y="194" width="14" height="70" />
            <rect className={styles.base} x="90" y="262" width="140" height="40" rx="10" />
            <circle className={styles.dial} cx="200" cy="282" r="9" />
            <line className={styles.tick} x1="200" y1="276" x2="200" y2="281" />
          </svg>
          <figcaption className="mono">
            Illustrative · drawn in code · Morrow does not exist
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

const SPECS = [
  ["Sunrise", "10 to 45 minutes, set on the dial"],
  ["Colour", "1800 K to 6500 K"],
  ["Brightness", "Up to the light of an overcast morning"],
  ["Sound", "None"],
  ["Screen", "None"],
  ["Standby light", "Off"],
] as const;

export function Quiet() {
  return (
    <section id="quiet" className={styles.section} aria-labelledby="quiet-title">
      <div className={styles.copy}>
        <p className="mono">Chapter four · Quiet</p>
        <h2 id="quiet-title" className={styles.h2}>
          Made to be quiet.
        </h2>
        <p className={styles.text}>
          Everything about Morrow is turned down: no chime, no blinking standby light, nothing to
          read at three in the morning.
        </p>
      </div>
      <dl className={styles.specs}>
        {SPECS.map(([term, value]) => (
          <div key={term}>
            <dt className="mono">{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>
        Illustrative specification for a fictional product. Morrow does not exist and there is
        nothing to buy.
      </p>
    </section>
  );
}
