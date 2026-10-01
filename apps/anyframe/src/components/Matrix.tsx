// The contact sheet, embedded: the last contactsheet run against this site across the full
// device matrix, read at build time from reports/anyframe/contactsheet.json.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Sheet } from "@quartifex/contactsheet";
import styles from "./Matrix.module.css";

const REPORT = path.join(process.cwd(), "..", "..", "reports", "anyframe", "contactsheet.json");

function readSheet(): Sheet | null {
  try {
    return JSON.parse(readFileSync(REPORT, "utf8")) as Sheet;
  } catch {
    return null;
  }
}

export function Matrix() {
  const sheet = readSheet();
  const rows = sheet?.rows ?? [];
  const flagged = rows.filter((r) => r.error || r.cells.some((c) => c.flags.length > 0));
  const groups = [...new Set(rows.map((r) => r.profile.group))];
  return (
    <section className={styles.matrix} data-chapter="matrix" aria-labelledby="matrix-title">
      <header className={styles.head}>
        <h2 id="matrix-title" className={styles.h2}>
          Checked on {rows.length || "every"} screens
        </h2>
        <p className={styles.lede}>
          contactsheet loads this page on every profile in its matrix, from a 375 px phone to a 5120
          px ultrawide, shoots each chapter and flags a subject outside the frame, copy over the
          subject, overlapping text, small tap targets, oversized canvases and layout shift.
        </p>
      </header>
      {sheet ? (
        <>
          <p className={styles.summary} data-testid="matrix-summary">
            {rows.length} profiles in {groups.length} groups · {sheet.chapters.length} chapters ·{" "}
            {flagged.length === 0 ? "no flags" : `${flagged.length} with flags`} · run{" "}
            {sheet.createdAt.slice(0, 10)}
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="visually-hidden">
                Contact sheet results per device profile
              </caption>
              <thead>
                <tr>
                  <th scope="col">Profile</th>
                  <th scope="col">Screen</th>
                  {sheet.chapters.map((c) => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.profile.name}>
                    <th scope="row">{row.profile.name}</th>
                    <td className={styles.meta}>
                      {row.profile.width} x {row.profile.height} @{row.profile.dpr}
                    </td>
                    {row.error ? (
                      <td colSpan={sheet.chapters.length}>Error: {row.error}</td>
                    ) : (
                      row.cells.map((cell) => (
                        <td key={cell.chapter}>
                          {cell.flags.length === 0 ? (
                            <span className={styles.pass}>Clear</span>
                          ) : (
                            <ul className={styles.flags}>
                              {cell.flags.map((f) => (
                                <li key={f.message}>{f.message}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>
            The screenshots and the full sheet (HTML and PNG) are written next to the JSON by{" "}
            <code>pnpm --filter @quartifex/site-anyframe sheet</code>; images are never committed.
          </p>
        </>
      ) : (
        <p className={styles.note}>No contact sheet yet: run the sheet script, then build.</p>
      )}
    </section>
  );
}
