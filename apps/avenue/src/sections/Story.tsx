// The opening over the 3D stage: the car in the studio, the driver's door, the driver's seat
// and its three screens, the centre display, then the back seats. One screen each; their parts
// animate in when the chapter becomes active and out when it leaves (Journey.tsx sets
// data-active; the transitions are in chapters.module.css).
import { Btn } from "@/components/Btn";
import s from "./chapters.module.css";

export function Hero() {
  return (
    <section
      id="ch-hero"
      data-chapter="hero"
      data-slide
      data-snap
      data-theme="paper"
      className={`${s.chapter} ${s.hero} ${s.studio}`}
      aria-labelledby="hero-title"
    >
      <div className={`wrap ${s.heroBody}`}>
        <div
          className={`${s.panel} ${s.bare} ${s.heroPanel}`}
          data-anim
          style={{ "--d": 0 } as React.CSSProperties}
        >
          <p className="eyebrow">AVENUE · an in-car system · concept</p>
          <h1 id="hero-title" className={`display ${s.heroTitle}`} data-split>
            Every screen in the car,{" "}
            <span className={s.nowrap}>
              <span className="kw">as&nbsp;one</span>.
            </span>{" "}
            <span className="muted">Front and back.</span>
          </h1>
          <p className={s.what}>
            <strong>AVENUE is an infotainment system for the whole cabin</strong>, designed around
            the screens a modern car comes with: the driver display, the portrait centre display and
            the head-up display. It adds a screen for each back seat and runs all five as one system
            on Android Automotive.
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
          Scroll to step in
        </span>
        <span className={`label ${s.credit}`}>Concept visual</span>
      </div>
    </section>
  );
}

export function Enter() {
  return (
    <section
      id="ch-enter"
      data-chapter="enter"
      data-slide
      data-snap
      data-theme="paper"
      className={`${s.chapter} ${s.problem} ${s.studio}`}
      aria-labelledby="enter-title"
    >
      <div className={`${s.panel} ${s.bare} ${s.left}`} data-anim="left">
        <p className="eyebrow">01 · The car as it is</p>
        <h2 id="enter-title" className="h1" data-split>
          We started with the hardware. <span className="muted">Not with a blank cabin.</span>
        </h2>
        <p className="lede">
          Three screens come with the car. Rather than add more up front, AVENUE gives each one a
          single job, so the driver always knows where to look, and puts the new screens where
          people had none: in the back.
        </p>
      </div>
    </section>
  );
}

const FRONT = [
  { name: "Head-up display", job: "The road", note: "Speed and the next turn, over the bonnet" },
  { name: "Driver display", job: "The car", note: "Speed, range, the turn ahead" },
  { name: "Centre display", job: "Everything else", note: "Map, media, climate, the back seats" },
];

export function Seat() {
  return (
    <section
      id="ch-cabin"
      data-chapter="cabin"
      data-slide
      data-snap
      className={`${s.chapter} ${s.cabin}`}
      aria-labelledby="cabin-title"
    >
      <div className={`${s.panel} ${s.bare} ${s.cabinHead}`} data-anim>
        <p className="eyebrow">02 · The driver&rsquo;s seat</p>
        <h2 id="cabin-title" className="h1" data-split>
          Three screens. <span className="muted">Three jobs.</span>
        </h2>
      </div>
      <ul className={`wrap ${s.seatRow} ${s.seatRow3}`}>
        {FRONT.map((f, i) => (
          <li
            key={f.name}
            className={s.seatCell}
            data-anim
            style={{ "--d": i + 2 } as React.CSSProperties}
          >
            <span className="label">{f.name}</span>
            <span className={s.seatMode}>{f.job}</span>
            <span className={s.seatNote}>{f.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Beat = {
  id: string;
  coord: string;
  title: string;
  muted: string;
  lede: string;
  word: string;
  notes: { head: string; body: string }[];
};

const BEATS: Beat[] = [
  {
    id: "driver",
    coord: "A1 · Driver",
    title: "Eyes up.",
    muted: "Only what driving needs, where the eyes already are.",
    lede: "The head-up display carries speed and the next turn. The driver display adds range and what is playing. Nothing else competes for the glance.",
    word: "Glance",
    notes: [
      {
        head: "While moving",
        body: "Video, apps and settings lock for the driver. Music, calls and the route stay.",
      },
      {
        head: "One number per idea",
        body: "Speed, distance to the turn, range: large, short, and in the same place every time.",
      },
    ],
  },
  {
    id: "centre",
    coord: "A2 · Centre display",
    title: "One tall screen, shared.",
    muted: "The map, what is playing and the climate, within reach of both front seats.",
    lede: "The portrait display keeps the map in its top half. Media, the rest of the car and the climate sit below it and never cover the route.",
    word: "Centre",
    notes: [
      {
        head: "Portrait first",
        body: "Built for a tall screen: one column, thumb-height controls at the bottom.",
      },
      {
        head: "The whole car at a glance",
        body: "What each back seat is playing, the battery and the seats, as tiles under the media.",
      },
    ],
  },
  {
    id: "rear",
    coord: "A3 · Back seats",
    title: "The back seats get their own.",
    muted: "Two screens on the headrests.",
    lede: "Films, music, their own climate zone and the journey, on the same system as the front. What the front shares arrives as a card.",
    word: "Lounge",
    notes: [
      {
        head: "Their own zone",
        body: "Each rear screen runs its own media, temperature and journey view.",
      },
      {
        head: "Sent from the front",
        body: "A film or a place shared from the centre display waits on the screen; one tap plays it.",
      },
    ],
  },
];

export function Beats() {
  return (
    <div id="features">
      {BEATS.map((f, index) => (
        <section
          key={f.id}
          id={`ch-${f.id}`}
          data-chapter={f.id}
          data-slide
          data-snap
          className={`${s.chapter} ${s.feature}`}
          data-side={index % 2 ? "right" : "left"}
          data-moving={f.id === "driver" ? "true" : undefined}
          aria-labelledby={`${f.id}-title`}
        >
          <p className={`mega ${s.word}`} aria-hidden="true">
            {f.word}
          </p>
          <div className={`wrap ${s.featureGrid}`}>
            <header
              className={`${s.panel} ${s.featureHead}`}
              data-anim={index % 2 ? "right" : "left"}
            >
              <div className={s.featureMeta}>
                <span className="eyebrow">{f.coord}</span>
                <span className="tag" data-status="extension">
                  New in this concept
                </span>
              </div>
              <h2 id={`${f.id}-title`} className="h1" data-split>
                {f.title} <span className="muted">{f.muted}</span>
              </h2>
              <p className="lede">{f.lede}</p>
            </header>
            <div className={s.notes}>
              {f.notes.map((n, i) => (
                <div
                  key={n.head}
                  className={s.note}
                  data-anim
                  style={{ "--d": 4 + i } as React.CSSProperties}
                >
                  <span className="label">{n.head}</span>
                  <p>{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
