// The first three chapters over the 3D stage: the night drive (hero), the problem, and the
// way into the cabin. Each is a tall section with a sticky frame; the camera reads its
// progress (Journey.tsx) while its words hold still.
import { Btn } from "@/components/Btn";
import s from "./chapters.module.css";

export function Hero() {
  return (
    <section
      data-chapter="hero"
      data-progress
      className={`${s.chapter} ${s.hero}`}
      aria-labelledby="hero-title"
    >
      <div className={s.sticky}>
        <p className={`mega ${s.heroMega}`} aria-hidden="true">
          Avenue
        </p>
        <div className={`wrap ${s.heroBody}`}>
          <p className="eyebrow" data-hero-after>
            A Quartifex concept · available for collaboration
          </p>
          <h1 id="hero-title" className={`display ${s.heroTitle}`} data-hero-split>
            Every seat gets a <span className="kw">first&#8209;class</span> screen.{" "}
            <span className="muted">And the screens work together.</span>
          </h1>
          <div className={s.actions} data-hero-after>
            <Btn href="#partner">Partner with us</Btn>
            <Btn href="#demo" variant="quiet">
              Try the demo
            </Btn>
          </div>
        </div>
        <div className={`wrap ${s.heroFoot}`}>
          <span className="label">00 · Blue hour</span>
          <span className={s.scrollHint} aria-hidden="true">
            <i />
            Scroll to drive
          </span>
          <span className={`label ${s.credit}`}>Vehicle model for demonstration only</span>
        </div>
      </div>
    </section>
  );
}

export function Problem() {
  return (
    <section
      data-chapter="problem"
      className={`${s.chapter} ${s.problem}`}
      aria-labelledby="problem-title"
    >
      <div className={s.sticky}>
        <div className={`wrap ${s.left}`}>
          <p className="eyebrow">01 · The problem</p>
          <h2 id="problem-title" className="h1" data-split>
            Cars gained screens.{" "}
            <span className="muted">The system behind them stayed the same.</span>
          </h2>
          <p className="lede">
            Most cabins now carry several displays, each designed on its own. In the back, where
            people sit longest, the screen rarely matches the one up front, so passengers reach for
            their own tablets. That was where our research with rear-seat passengers began.
          </p>
        </div>
      </div>
    </section>
  );
}

const SEATS = [
  { name: "Driver", mode: "Glance", status: "extension" as const, note: "Big, short, voice first" },
  {
    name: "Co-pilot",
    mode: "Navigator",
    status: "extension" as const,
    note: "Route, media, the car",
  },
  { name: "Rear left", mode: "Lounge", status: "tested" as const, note: "Films, music, comfort" },
  { name: "Rear right", mode: "Lounge", status: "tested" as const, note: "Films, music, comfort" },
];

export function Cabin() {
  return (
    <section
      id="ch-cabin"
      data-chapter="cabin"
      data-progress
      className={`${s.chapter} ${s.cabin}`}
      aria-labelledby="cabin-title"
    >
      <div className={s.sticky}>
        <div className={`wrap ${s.cabinHead}`}>
          <p className="eyebrow">02 · Into the cabin</p>
          <h2 id="cabin-title" className="h1" data-split>
            One system. <span className="muted">Four seats, each with a mode of its own.</span>
          </h2>
        </div>
        <ul className={`wrap ${s.seatRow}`}>
          {SEATS.map((seat, i) => (
            <li
              key={seat.name}
              className={`frame ${s.seatCell}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="label">{seat.name}</span>
              <span className={s.seatMode}>{seat.mode}</span>
              <span className={s.seatNote}>{seat.note}</span>
              <span className="tag" data-status={seat.status}>
                {seat.status === "tested" ? "User-tested" : "Extension"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
