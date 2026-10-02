// Chapter five: what the three levels are, and the audit of each, from CI.
import { type Audit, readAudit } from "@/lib/audit";
import styles from "./Proof.module.css";

const LEVELS = [
  {
    id: "full",
    name: "Full",
    what: "The dawn is pinned and scrubbed by the scroll, light shafts drift through the window, the colour of the light follows the scroll, and the lamp's glow breathes.",
  },
  {
    id: "reduced",
    name: "Reduced",
    what: "The same story, held: one picture of the room just after sunrise with still light, no pinning and no scrubbing. Text and steps fade in once; nothing travels.",
  },
  {
    id: "static",
    name: "Static",
    what: "A calm document: no motion at all, the picture as a framed still, everything in one column. It is also what the page shows without JavaScript.",
  },
] as const;

const score = (n: number | undefined) => (n === undefined ? "–" : String(Math.round(n * 100)));

function date(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function Proof() {
  const audit = readAudit();
  return (
    <section id="proof" className={styles.section} aria-labelledby="proof-title">
      <div className={styles.copy}>
        <p className="mono">Chapter five · The proof</p>
        <h2 id="proof-title" className={styles.h2}>
          One story, three ways, audited.
        </h2>
        <p className={styles.text}>
          Cinematic does not have to mean inaccessible. Auto follows your system's reduced-motion
          setting; the switch at the top overrides it and is remembered on this device. Every
          chapter is a link in the rail, and focus moves to the chapter you choose.
        </p>
      </div>

      <ol className={styles.levels}>
        {LEVELS.map((l) => (
          <li key={l.id}>
            <h3 className={styles.h3}>{l.name}</h3>
            <p>{l.what}</p>
          </li>
        ))}
      </ol>

      {audit ? <Results audit={audit} /> : <p className={styles.text}>No audit has run yet.</p>}
    </section>
  );
}

function Results({ audit }: { audit: Audit }) {
  const where =
    audit.environment.kind === "ci" && audit.environment.runUrl ? (
      <a href={audit.environment.runUrl}>{audit.environment.name}</a>
    ) : (
      audit.environment.name
    );
  return (
    <div className={styles.results}>
      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="audit-table">
          <caption className={styles.caption}>
            Accessibility audit of this page in each level
          </caption>
          <thead>
            <tr>
              <th scope="col">Level</th>
              <th scope="col">axe violations</th>
              <th scope="col">axe rules passed</th>
              <th scope="col">Lighthouse accessibility</th>
              <th scope="col">Best practices</th>
              <th scope="col">SEO</th>
              <th scope="col">Performance</th>
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((l) => {
              const m = audit.modes[l.id];
              return (
                <tr key={l.id}>
                  <th scope="row">{l.name}</th>
                  <td data-testid={`axe-${l.id}`}>{m.axe.violations.length}</td>
                  <td>{m.axe.passes}</td>
                  <td>{score(m.lighthouse?.accessibility)}</td>
                  <td>{score(m.lighthouse?.["best-practices"])}</td>
                  <td>{score(m.lighthouse?.seo)}</td>
                  <td>{score(m.lighthouse?.performance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {Object.entries(audit.modes).some(([, m]) => m.axe.violations.length > 0) && (
        <ul className={styles.violations}>
          {Object.entries(audit.modes).flatMap(([mode, m]) =>
            m.axe.violations.map((v) => (
              <li key={`${mode}-${v.id}`}>
                {mode}: {v.help} ({v.impact ?? "unrated"}, {v.nodes} element
                {v.nodes === 1 ? "" : "s"})
              </li>
            )),
          )}
        </ul>
      )}
      <p className={styles.method} data-testid="audit-method">
        Run by {where} on {date(audit.createdAt)}
        {audit.commit ? `, commit ${audit.commit.slice(0, 7)}` : ""}. axe-core {audit.tools.axe}{" "}
        with the WCAG 2.0, 2.1 and 2.2 A and AA rules, after the page settles in each level.
        {audit.tools.lighthouse
          ? ` Lighthouse ${audit.tools.lighthouse}, its default mobile profile. Performance is measured on a shared CI machine and moves from run to run.`
          : " Lighthouse did not run."}{" "}
        Automated checks find a share of accessibility problems, not all of them; the keyboard paths
        and the level switch have their own behaviour tests, run on every push.
      </p>
    </div>
  );
}
