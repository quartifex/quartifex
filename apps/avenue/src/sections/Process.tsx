// How AVENUE was designed: research, requirements, information architecture, testing. The
// requirement explorer and the A/B chart carry the evidence; both say plainly that the
// research and the test covered the rear seats only.

import { Needed } from "@/components/Needed";
import { AB_CONTEXT, AB_METRICS } from "@/content/abtest";
import { REQUIREMENTS } from "@/content/volere";
import s from "./Process.module.css";
import { VolereExplorer } from "./VolereExplorer";

const STEPS = [
  {
    n: "01",
    title: "Research",
    text: "Interviews with rear-seat passengers, desk research, competitive benchmarking and empathy maps of a long car journey. The finding that set the brief: in the back, passengers are bored and fall back on their own devices.",
  },
  {
    n: "02",
    title: "Requirements",
    text: "Twenty-five Volere cards, A to Y, each with a rationale, a fit criterion and its source in the research, prioritised with MoSCoW.",
  },
  {
    n: "03",
    title: "Information architecture",
    text: "A home screen that branches into journey, content, car controls, features, quick widgets and settings, with task flows for getting information, entertainment and utilities on the move.",
  },
  {
    n: "04",
    title: "Testing",
    text: "Paper sketches, then low- and high-fidelity prototypes, then an A/B test of two versions with a survey afterwards.",
  },
];

function ABChart() {
  // Ratings out of 5, V1 against V2, as recorded on the board.
  const rowH = 46;
  const left = 190;
  const width = 640;
  const scale = (v: number) => left + (v / 5) * (width - left - 30);
  const height = AB_METRICS.length * rowH + 50;
  return (
    <figure className={s.chart}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="ab-title ab-desc">
        <title id="ab-title">A/B test ratings, version 1 against version 2</title>
        <desc id="ab-desc">
          {AB_METRICS.map(
            (m) =>
              `${m.name}: version 1 ${m.v1}, version 2 ${m.v2}${m.lowerIsBetter ? " (lower is better)" : ""}`,
          ).join("; ")}
        </desc>
        {[0, 1, 2, 3, 4, 5].map((t) => (
          <g key={t}>
            <line x1={scale(t)} x2={scale(t)} y1={20} y2={height - 24} stroke="var(--c-line)" />
            <text x={scale(t)} y={height - 6} textAnchor="middle" className={s.tick}>
              {t}
            </text>
          </g>
        ))}
        {AB_METRICS.map((m, i) => {
          const y = 30 + i * rowH + rowH / 2;
          const better = m.lowerIsBetter ? m.v2 < m.v1 : m.v2 > m.v1;
          return (
            <g key={m.name}>
              <text x={0} y={y - 4} className={s.metric}>
                {m.name}
              </text>
              <text x={0} y={y + 13} className={s.metricNote}>
                {m.lowerIsBetter ? "lower is better" : "higher is better"}
              </text>
              <line
                x1={scale(m.v1)}
                x2={scale(m.v2)}
                y1={y}
                y2={y}
                stroke={better ? "var(--c-accent)" : "var(--c-text-faint)"}
                strokeWidth={3}
              />
              <circle
                cx={scale(m.v1)}
                cy={y}
                r={6}
                fill="var(--c-bg)"
                stroke="var(--c-text-muted)"
                strokeWidth={2}
              />
              <circle cx={scale(m.v2)} cy={y} r={7} fill="var(--c-accent)" />
            </g>
          );
        })}
      </svg>
      <figcaption className={s.legend}>
        <span>
          <i className={s.dotV1} /> Version 1
        </span>
        <span>
          <i className={s.dotV2} /> Version 2
        </span>
      </figcaption>
    </figure>
  );
}

export function Process() {
  return (
    <section
      id="design"
      data-theme="paper"
      className={`section dusk ${s.process}`}
      aria-labelledby="design-title"
    >
      <div className="grid-lines" aria-hidden="true" />
      <div className="wrap">
        <header className={s.header}>
          <p className="eyebrow">R · How it was designed</p>
          <h2 id="design-title" className="h1" data-split>
            Grounded in the people in the back seat.
          </h2>
          <p className="lede">
            AVENUE began as a rear-seat system for luxury cars. The research, the requirements and
            the A/B test below are from that work. The driver and co-pilot modes extend it, and have
            not yet been tested with users.
          </p>
        </header>

        <ol className={s.steps}>
          {STEPS.map((step) => (
            <li key={step.n} className={s.step} data-beat>
              <span className={`mono ${s.stepN}`}>{step.n}</span>
              <h3 className="h3">{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>

        <div className={s.block} id="requirements">
          <div className={s.blockHead}>
            <h3 className="h2">The {REQUIREMENTS.length} requirements</h3>
            <p className={s.blockLede}>
              Every Volere card from the research, as filed. Filter by priority and type; open a
              card for its rationale and fit criterion.
            </p>
          </div>
          <VolereExplorer />
        </div>

        <div className={s.block} id="testing">
          <div className={s.blockHead}>
            <h3 className="h2">What the A/B test showed</h3>
            <p className={s.blockLede}>
              Survey ratings out of 5 after testing two versions of the rear-seat interface. Version
              2 is the design AVENUE builds on.
            </p>
          </div>
          <div className={s.abGrid}>
            <ABChart />
            <div className={s.abTable}>
              <table>
                <caption className="sr-only">A/B ratings and recorded net difference</caption>
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col">V1</th>
                    <th scope="col">V2</th>
                    <th scope="col">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {AB_METRICS.map((m) => (
                    <tr key={m.name}>
                      <th scope="row">
                        {m.name}
                        {m.lowerIsBetter ? <span className={s.lower}>lower is better</span> : null}
                      </th>
                      <td className="mono">{m.v1}</td>
                      <td className="mono">{m.v2}</td>
                      <td className="mono">
                        {m.net === null ? (
                          <span className={s.withheld} title={m.note}>
                            To be confirmed
                          </span>
                        ) : (
                          `${m.net > 0 ? "+" : m.net < 0 ? "−" : ""}${Math.abs(m.net)}`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className={s.facts}>
                <div>
                  <dt>Scope</dt>
                  <dd>{AB_CONTEXT.scope}</dd>
                </div>
                <div>
                  <dt>Scale</dt>
                  <dd>{AB_CONTEXT.scale}</dd>
                </div>
                <div>
                  <dt>Participants</dt>
                  <dd>
                    <Needed value={AB_CONTEXT.participants} />
                  </dd>
                </div>
                <div>
                  <dt>Method</dt>
                  <dd>
                    <Needed value={AB_CONTEXT.method} />
                  </dd>
                </div>
              </dl>
              <p className={s.note}>
                Physical effort: the recorded net difference does not match its two ratings, so only
                the ratings are shown until it is confirmed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
