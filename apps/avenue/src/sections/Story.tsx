// The first three chapters over the 3D stage: the hero, the problem, and the way into the
// cabin. One screen each; their parts animate in when the chapter becomes active and out when
// it leaves (Journey.tsx sets data-active; the transitions are in chapters.module.css).
import { Btn } from "@/components/Btn";
import s from "./chapters.module.css";

export function Hero() {
  return (
    <section
      id="ch-hero"
      data-chapter="hero"
      data-slide
      data-snap
      className={`${s.chapter} ${s.hero}`}
      aria-labelledby="hero-title"
    >
      <p className={`mega ${s.heroMega}`} aria-hidden="true">
        Avenue
      </p>
      <div className={`wrap ${s.heroBody}`}>
        <div
          className={`${s.panel} ${s.heroPanel}`}
          data-anim
          style={{ "--d": 0 } as React.CSSProperties}
        >
          <p className="eyebrow">A connected cabin system · open for partners</p>
          <h1 id="hero-title" className={`display ${s.heroTitle}`} data-split>
            Every seat gets a <span className="kw">first&#8209;class</span> screen.{" "}
            <span className="muted">And the screens work together.</span>
          </h1>
          <p className={s.what}>
            <strong>AVENUE is an infotainment system for the whole car</strong>: the driver&rsquo;s
            display, a co-pilot screen and a screen for each rear seat, running as one system on
            Android Automotive. Media, the route, climate and SOS move between seats, and the
            driver&rsquo;s screen stays calm while the car is moving.
          </p>
          <div className={s.actions}>
            <Btn href="#demo">Try the live demo</Btn>
            <Btn href="#partner" variant="quiet">
              Partner with us
            </Btn>
          </div>
        </div>
      </div>
      <div className={`wrap ${s.heroFoot}`}>
        <span className={s.scrollHint} aria-hidden="true">
          <i />
          Scroll to drive
        </span>
        <span className={`label ${s.credit}`}>Vehicle model for demonstration only</span>
      </div>
    </section>
  );
}

export function Problem() {
  return (
    <section
      id="ch-problem"
      data-chapter="problem"
      data-slide
      data-snap
      className={`${s.chapter} ${s.problem}`}
      aria-labelledby="problem-title"
    >
      <div className={`${s.panel} ${s.left}`} data-anim="left">
        <p className="eyebrow">01 · The problem</p>
        <h2 id="problem-title" className="h1" data-split>
          Cars gained screens.{" "}
          <span className="muted">The system behind them stayed the same.</span>
        </h2>
        <p className="lede">
          Most cabins now carry several displays, each designed on its own. In the back, where
          people sit longest, the screen rarely matches the one up front, so passengers reach for
          their own tablets. That is where our research began.
        </p>
      </div>
    </section>
  );
}

const SEATS = [
  { name: "Driver", mode: "Glance", note: "Big, short, voice first" },
  { name: "Co-pilot", mode: "Navigator", note: "Route, media, the car" },
  { name: "Rear left", mode: "Lounge", note: "Films, music, comfort" },
  { name: "Rear right", mode: "Lounge", note: "Films, music, comfort" },
];

export function Cabin() {
  return (
    <section
      id="ch-cabin"
      data-chapter="cabin"
      data-slide
      data-snap
      className={`${s.chapter} ${s.cabin}`}
      aria-labelledby="cabin-title"
    >
      <div className={`${s.panel} ${s.cabinHead}`} data-anim>
        <p className="eyebrow">02 · Into the cabin</p>
        <h2 id="cabin-title" className="h1" data-split>
          One system. <span className="muted">Four seats, each with a mode of its own.</span>
        </h2>
      </div>
      <ul className={`wrap ${s.seatRow}`}>
        {SEATS.map((seat, i) => (
          <li
            key={seat.name}
            className={s.seatCell}
            data-anim
            style={{ "--d": i + 2 } as React.CSSProperties}
          >
            <span className="label">{seat.name}</span>
            <span className={s.seatMode}>{seat.mode}</span>
            <span className={s.seatNote}>{seat.note}</span>
            <span className="tag" data-status="tested">
              User-tested
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
