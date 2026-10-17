// The first three beats over the stage: the hero, the problem, and the way into the cabin.
// Server-rendered copy; the camera and the motion come from Journey and the stage.
import Image from "next/image";
import styles from "./Story.module.css";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`wrap ${styles.heroInner}`}>
        <p className="eyebrow">A Quartifex concept, available for collaboration</p>
        <Image
          className={styles.wordmark}
          src="/brand/avenue-logo.svg"
          alt="AVENUE"
          width={611}
          height={69}
          unoptimized
          priority
        />
        <h1 id="hero-title" className={styles.heroTitle}>
          Every seat gets a first&#8209;class screen. And the screens work together.
        </h1>
        <div className={styles.heroActions}>
          <a className="btn" data-variant="primary" href="#partner">
            Partner with us
          </a>
          <a className="btn" data-variant="ghost" href="#demo">
            Try the demo
          </a>
        </div>
      </div>
      <p className={`mono ${styles.caption}`}>
        Concept visual. An invented, unbadged car modelled in code.
      </p>
      <div className={styles.cue} aria-hidden="true">
        <span />
      </div>
    </section>
  );
}

export function Problem() {
  return (
    <section className={styles.problem} aria-labelledby="problem-title" data-pin>
      <div className={`wrap ${styles.problemInner}`}>
        <p className="eyebrow">The problem</p>
        <h2 id="problem-title" className="h1" data-split>
          Cars gained screens. The system behind them stayed the same.
        </h2>
        <p className="lede">
          Most cabins now carry several displays, each designed on its own. In the back, where
          people sit longest, the screen rarely matches the one up front, so passengers reach for
          their own tablets. That was the starting point of our research with rear-seat passengers.
        </p>
      </div>
    </section>
  );
}

const SEAT_MODES = [
  {
    seat: "Driver",
    text: "Read at a glance while moving: large targets, voice and physical controls first, nothing that holds the eyes for long.",
    evidence: "Design extension, not yet user-tested",
    tested: false,
  },
  {
    seat: "Co-pilot",
    text: "The navigator's seat: the route, the music and the car, with full media on a screen the driver cannot see.",
    evidence: "Design extension, not yet user-tested",
    tested: false,
  },
  {
    seat: "Rear left and rear right",
    text: "Lounge screens for long journeys: films, music, the route, the cabin's climate and a way to share with the front.",
    evidence: "Researched and user-tested",
    tested: true,
  },
];

export function Cabin() {
  return (
    <section className={styles.cabin} aria-labelledby="cabin-title">
      <div className={`wrap ${styles.cabinIntro}`} data-beat>
        <p className="eyebrow">Inside</p>
        <h2 id="cabin-title" className="h1" data-split>
          One system. Four seats, each with a mode of its own.
        </h2>
      </div>
      <div className={`wrap ${styles.modes}`}>
        {SEAT_MODES.map((m) => (
          <article key={m.seat} className={styles.mode} data-beat>
            <h3 className="h3">{m.seat}</h3>
            <p>{m.text}</p>
            <p className={styles.evidence} data-tested={m.tested ? "" : undefined}>
              {m.evidence}
            </p>
          </article>
        ))}
      </div>
      <div className={`wrap ${styles.cabinOutro}`} data-beat>
        <p className="lede">
          The screens wake together and they talk to each other: send a film from the front to the
          back, or a place from the back to the front. Nothing takes over a screen without its
          passenger saying yes.
        </p>
      </div>
    </section>
  );
}
