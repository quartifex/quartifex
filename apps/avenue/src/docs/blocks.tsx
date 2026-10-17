// Blocks the documentation's MDX can use. They render from the same sources the product uses
// (tokens.ts, modules.ts, the NHTSA source in site.ts), so the docs cannot drift from it.
import { MODULES, SYSTEM_FEATURES } from "@/content/modules";
import { SOURCES } from "@/content/site";
import {
  colour,
  colourRoles,
  contrast,
  contrastPairs,
  elevation,
  motion,
  radius,
  space,
  target,
  type,
} from "@/design/tokens";
import s from "./docs.module.css";
import { ComponentShowcase } from "./Showcase";

const kebab = (k: string) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function ColourTable() {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <caption className="sr-only">Colour tokens in both themes</caption>
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Cabin</th>
            <th scope="col">Paper</th>
            <th scope="col">Use</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(colour.cabin) as Array<keyof typeof colour.cabin>).map((k) => (
            <tr key={k}>
              <th scope="row">
                <code>--c-{kebab(k)}</code>
              </th>
              {(["cabin", "paper"] as const).map((t) => (
                <td key={t}>
                  <span className={s.swatch} data-theme={t}>
                    <i style={{ background: colour[t][k] }} />
                    <code>{colour[t][k]}</code>
                  </span>
                </td>
              ))}
              <td>{colourRoles[k]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContrastTable() {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <caption className="sr-only">Contrast ratios against WCAG 2.2 AA</caption>
        <thead>
          <tr>
            <th scope="col">Foreground on background</th>
            <th scope="col">Needs</th>
            <th scope="col">Cabin</th>
            <th scope="col">Paper</th>
          </tr>
        </thead>
        <tbody>
          {contrastPairs.map(([fg, bg, min]) => (
            <tr key={`${fg}-${bg}`}>
              <th scope="row">
                <code>{kebab(fg)}</code> on <code>{kebab(bg)}</code>
              </th>
              <td className="mono">{min}:1</td>
              {(["cabin", "paper"] as const).map((t) => {
                const r = contrast(colour[t][fg], colour[t][bg]);
                return (
                  <td key={t} className="mono">
                    {r.toFixed(2)}:1 <span className={s.pass}>{r >= min ? "pass" : "fail"}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TypeScale() {
  return (
    <div className={s.typeScale}>
      {(
        Object.entries(type.site) as Array<[string, (typeof type.site)[keyof typeof type.site]]>
      ).map(([k, t]) => (
        <div key={k} className={s.typeRow}>
          <code className={s.typeMeta}>
            --t-{k} · {t.min}–{t.max}px · {t.weight}
          </code>
          <span
            className={s.typeSample}
            style={{
              fontSize: `var(--t-${k})`,
              lineHeight: t.line,
              fontWeight: t.weight,
              fontStretch: `${t.width}%`,
              fontFamily:
                k === "mono"
                  ? "var(--font-mono)"
                  : k === "body" || k === "small" || k === "h3"
                    ? "var(--font-ui)"
                    : "var(--font-display)",
            }}
          >
            {k === "mono" ? "ETA 42 MIN · 31 KM" : "Every seat, first class"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Scales() {
  return (
    <div className={s.scales}>
      <figure className={s.scale}>
        <figcaption>Spacing</figcaption>
        {Object.entries(space).map(([k, v]) => (
          <div key={k} className={s.spaceRow}>
            <code>--s-{k}</code>
            <span style={{ width: v }} />
            <code className="mono">{v}px</code>
          </div>
        ))}
      </figure>
      <figure className={s.scale}>
        <figcaption>Radius</figcaption>
        <div className={s.radii}>
          {Object.entries(radius).map(([k, v]) => (
            <div key={k} className={s.radius}>
              <span style={{ borderRadius: Math.min(v, 40) }} />
              <code>
                {k} · {v === 999 ? "pill" : `${v}px`}
              </code>
            </div>
          ))}
        </div>
      </figure>
      <figure className={s.scale} data-theme="cabin">
        <figcaption>Elevation (cabin)</figcaption>
        <div className={s.elevations}>
          {Object.keys(elevation).map((k) => (
            <div key={k} className={s.elevation}>
              <span style={{ boxShadow: `var(--e-${k})` }} />
              <code>--e-{k}</code>
            </div>
          ))}
        </div>
      </figure>
    </div>
  );
}

export function MotionTokens() {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <caption className="sr-only">Motion tokens</caption>
        <tbody>
          {Object.entries(motion.duration).map(([k, v]) => (
            <tr key={k}>
              <th scope="row">
                <code>duration.{k}</code>
              </th>
              <td className="mono">{v} ms</td>
            </tr>
          ))}
          {Object.entries(motion.ease).map(([k, v]) => (
            <tr key={k}>
              <th scope="row">
                <code>ease.{k}</code>
              </th>
              <td className="mono">cubic-bezier({v.join(", ")})</td>
            </tr>
          ))}
          <tr>
            <th scope="row">
              <code>pressScale</code>
            </th>
            <td className="mono">{motion.pressScale}</td>
          </tr>
          {Object.entries(target).map(([k, v]) => (
            <tr key={k}>
              <th scope="row">
                <code>target.{k}</code>
              </th>
              <td className="mono">{v} px</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SeatModes() {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <caption className="sr-only">Seat modes and their evidence</caption>
        <thead>
          <tr>
            <th scope="col">Mode</th>
            <th scope="col">For</th>
            <th scope="col">Evidence</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Rear (left and right)</th>
            <td>Long journeys: media, the route, the cabin, sharing with the front</td>
            <td>Researched and user-tested (A/B)</td>
          </tr>
          <tr>
            <th scope="row">Co-pilot</th>
            <td>The navigator: route, music, car; full media where the driver cannot see it</td>
            <td>Design extension, not yet user-tested</td>
          </tr>
          <tr>
            <th scope="row">Driver</th>
            <td>Glanceable while moving; voice and physical controls first</td>
            <td>Design extension, not yet user-tested</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ModuleReference() {
  return (
    <div className={s.modules}>
      {MODULES.map((m) => (
        <article key={m.id} className={s.module} id={`module-${m.id}`}>
          <h3 className={s.moduleName}>{m.name}</h3>
          <p>{m.summary}</p>
          <dl className={s.moduleFacts}>
            <div>
              <dt>States</dt>
              <dd>{m.states.join(", ")}</dd>
            </div>
            <div>
              <dt>Requirements</dt>
              <dd className="mono">{m.requirements.join(", ")}</dd>
            </div>
            <div>
              <dt>Driver, moving</dt>
              <dd>
                <strong>{m.driving.rule}</strong>: {m.driving.detail}
              </dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>
                Rear: {m.evidence.rear === "tested" ? "researched and user-tested" : "extension"}.
                Front: extension.
              </dd>
            </div>
          </dl>
        </article>
      ))}
      {SYSTEM_FEATURES.map((f) => (
        <article key={f.name} className={s.module}>
          <h3 className={s.moduleName}>{f.name}</h3>
          <p>{f.summary}</p>
          <dl className={s.moduleFacts}>
            <div>
              <dt>Requirements</dt>
              <dd className="mono">{f.requirements.join(", ")}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

export function SafetyFigures() {
  return (
    <div className={s.figures}>
      <div className={s.figure}>
        <span className={s.figureValue}>
          2<small>s</small>
        </span>
        <span>or less for any single glance away from the road</span>
      </div>
      <div className={s.figure}>
        <span className={s.figureValue}>
          12<small>s</small>
        </span>
        <span>or less in total, glancing away, to complete a task</span>
      </div>
      <p className={s.figureNote}>
        The guidelines&rsquo; acceptance criteria for eye-glance testing (and, in the occlusion
        method, 1.5 s views adding up to no more than 12 s). <Source id="nhtsa" inline />
      </p>
    </div>
  );
}

export function Source({ id, inline }: { id: keyof typeof SOURCES; inline?: boolean }) {
  const src = SOURCES[id];
  return inline ? (
    <a href={src.url} rel="noopener" className={s.sourceInline}>
      Source
    </a>
  ) : (
    <p className={s.source}>
      Source:{" "}
      <a href={src.url} rel="noopener">
        {src.title}
      </a>
    </p>
  );
}

export { ComponentShowcase };

export const DOC_BLOCKS = {
  ColourTable,
  ContrastTable,
  TypeScale,
  Scales,
  MotionTokens,
  SeatModes,
  ModuleReference,
  SafetyFigures,
  Source,
  ComponentShowcase,
};
