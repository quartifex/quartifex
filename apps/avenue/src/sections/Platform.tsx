// The platform: Android Automotive OS and a reference hardware build to industry-standard
// specs. A target for partners, scoped with each one; not a shipping product. Every figure
// about a real part or car is cited.

import { More } from "@/components/More";
import {
  CONNECTIVITY,
  DISPLAYS,
  HARDWARE,
  OS,
  PLATFORM_NOTE,
  PLATFORM_SOURCES,
  QUALIFICATION,
  type SpecGroup,
} from "@/content/platform";
import s from "./Platform.module.css";

const FIGURES = [
  ["5", "nm", "Process, reference SoC"],
  ["30", "TOPS", "On-device AI (NPU)"],
  ["200K+", "DMIPS", "CPU"],
  ["4", "zones", "Screens, audio, climate"],
] as const;

function Group({ g }: { g: SpecGroup }) {
  return (
    <article className={s.group} aria-labelledby={`spec-${g.id}`} data-reveal>
      <header className={s.groupHead}>
        <span className={s.groupKicker}>{g.kicker}</span>
        <h3 id={`spec-${g.id}`} className="h3">
          {g.title}
        </h3>
      </header>
      <dl className={s.rows}>
        {g.rows.map((r) => (
          <div key={r.label} className={s.row}>
            <dt>{r.label}</dt>
            <dd>
              <strong>{r.value}</strong>
              {r.note ? <span>{r.note}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function Chip() {
  return (
    <div className={s.chip} aria-hidden="true">
      <div className={s.chipFace}>
        <span className={s.chipLabel}>AVENUE · reference</span>
        <div className={s.dies}>
          <i data-k="cpu">CPU</i>
          <i data-k="gpu">GPU</i>
          <i data-k="npu">NPU</i>
          <i data-k="isp">ISP</i>
          <i data-k="dsp">Audio DSP</i>
          <i data-k="sec">Secure</i>
        </div>
        <span className={s.chipFoot}>Android Automotive 15</span>
      </div>
    </div>
  );
}

export function Platform() {
  return (
    <section
      id="platform"
      data-snap
      data-theme="paper"
      data-wipe
      className={`section ${s.platform}`}
      aria-labelledby="platform-title"
    >
      <div className="grid-lines" aria-hidden="true" />
      <div className="wrap">
        <div className={s.top}>
          <header className={s.head}>
            <p className="eyebrow">S · The platform</p>
            <h2 id="platform-title" className="h1" data-split>
              <span className="kw">Android</span> inside.{" "}
              <span className="muted">Automotive grade under it.</span>
            </h2>
            <p className="lede">
              AVENUE is built for Android Automotive OS: one occupant zone per seat, driving rules
              per display, audio routed per zone, and sharing between screens built into the
              platform. The reference hardware below is what a four-screen cabin needs today.
            </p>
            <p className="tag" data-status="extension">
              {PLATFORM_NOTE}
            </p>
          </header>
          <Chip />
        </div>
        <ul className={s.figures}>
          {FIGURES.map(([v, u, l]) => (
            <li key={l} data-reveal>
              <b>
                {v}
                <small>{u}</small>
              </b>
              <span>{l}</span>
            </li>
          ))}
        </ul>
        <More
          label="The full reference specification"
          hint="Operating system, compute, displays, connectivity, qualification and sources"
          tone="paper"
        >
          <div className={s.groups}>
            <Group g={OS} />
            <Group g={HARDWARE} />
            <Group g={DISPLAYS} />
            <Group g={CONNECTIVITY} />
          </div>
          <div className={s.qual}>
            <p className="label">Qualification targets</p>
            <ul>
              {QUALIFICATION.map((q) => (
                <li key={q.label}>
                  <span>{q.label}</span>
                  <strong>{q.value}</strong>
                </li>
              ))}
            </ul>
          </div>
          <details className={s.sources}>
            <summary>Sources</summary>
            <ul>
              {PLATFORM_SOURCES.map((src) => (
                <li key={src.url}>
                  <a href={src.url} target="_blank" rel="noreferrer">
                    {src.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </More>
      </div>
    </section>
  );
}
