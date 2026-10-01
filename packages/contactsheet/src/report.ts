// The contact sheet itself: one self-contained HTML page (and a PNG of it), a row per
// profile and a column per chapter, with every flag listed under its frame.
import type { Flag } from "./checks.js";
import type { Profile } from "./profiles.js";

export type Cell = {
  chapter: string;
  /** Path of the screenshot, relative to the report. */
  image: string;
  flags: Flag[];
};

export type Row = { profile: Profile; cells: Cell[]; error?: string };

export type Sheet = {
  url: string;
  createdAt: string;
  chapters: string[];
  rows: Row[];
};

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

/** Flag counts by kind across the sheet. */
export function summarise(sheet: Sheet): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of sheet.rows) {
    for (const cell of row.cells) {
      for (const flag of cell.flags) counts[flag.kind] = (counts[flag.kind] ?? 0) + 1;
    }
  }
  return counts;
}

/** Render the sheet as a standalone HTML page. `thumbHeight` is the frame height in CSS px. */
export function renderHtml(sheet: Sheet, thumbHeight = 220): string {
  const counts = summarise(sheet);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const summary = total
    ? Object.entries(counts)
        .map(([kind, n]) => `<li><b>${n}</b> ${escapeHtml(kind)}</li>`)
        .join("")
    : "<li>No flags.</li>";

  const rows = sheet.rows
    .map((row) => {
      const p = row.profile;
      const head = `<th scope="row"><span class="name">${escapeHtml(p.name)}</span><span class="meta">${p.width}x${p.height} @${p.dpr} · ${escapeHtml(p.group)}</span></th>`;
      if (row.error)
        return `<tr>${head}<td colspan="${sheet.chapters.length}" class="error">${escapeHtml(row.error)}</td></tr>`;
      const cells = row.cells
        .map((cell) => {
          if (!cell.image) return `<td class="error">Chapter not found at this size</td>`;
          const flags = cell.flags.length
            ? `<ul class="flags">${cell.flags.map((f) => `<li data-kind="${escapeHtml(f.kind)}">${escapeHtml(f.message)}</li>`).join("")}</ul>`
            : `<p class="ok">No flags</p>`;
          const w = Math.round((thumbHeight * p.width) / p.height);
          return `<td><figure><img src="${escapeHtml(cell.image)}" width="${w}" height="${thumbHeight}" alt="${escapeHtml(`${p.name}, ${cell.chapter}`)}"><figcaption>${escapeHtml(cell.chapter)}</figcaption></figure>${flags}</td>`;
        })
        .join("");
      return `<tr>${head}${cells}</tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact sheet: ${escapeHtml(sheet.url)}</title>
<style>
  :root { color-scheme: dark; --bg: #050505; --fg: #edeae4; --muted: #8b8881; --line: rgb(237 234 228 / 0.14); --teal: #3fbead; --flag: #c1440e; }
  body { margin: 0; padding: 32px; background: var(--bg); color: var(--fg); font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; } .sub { color: var(--muted); margin: 0 0 16px; font-family: ui-monospace, monospace; font-size: 12px; }
  .summary { display: flex; gap: 16px; list-style: none; padding: 0; margin: 0 0 24px; font-family: ui-monospace, monospace; font-size: 12px; }
  table { border-collapse: collapse; } th, td { border-top: 1px solid var(--line); padding: 12px; vertical-align: top; text-align: left; }
  th { min-width: 180px; } .name { display: block; } .meta { display: block; color: var(--muted); font: 11px ui-monospace, monospace; font-weight: 400; }
  figure { margin: 0; } img { display: block; border: 1px solid var(--line); background: #111; }
  figcaption { color: var(--muted); font: 11px ui-monospace, monospace; margin-top: 4px; }
  .flags { margin: 6px 0 0; padding: 0 0 0 14px; max-width: 280px; font-size: 12px; } .flags li::marker { color: var(--flag); }
  .ok { margin: 6px 0 0; color: var(--teal); font-size: 12px; } .error { color: var(--flag); }
</style></head><body>
<h1>Contact sheet</h1>
<p class="sub">${escapeHtml(sheet.url)} · ${sheet.rows.length} profiles · ${sheet.chapters.length} chapters · ${escapeHtml(sheet.createdAt)}</p>
<ul class="summary">${summary}</ul>
<table><thead><tr><th scope="col">Profile</th>${sheet.chapters.map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join("")}</tr></thead>
<tbody>
${rows}
</tbody></table>
</body></html>
`;
}
