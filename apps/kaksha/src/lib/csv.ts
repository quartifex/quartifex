// Rosters in, results out. CSV from a file, or rows pasted from a spreadsheet
// (which arrive tab-separated). Hindi and English headers are both understood.

export const ROSTER_TEMPLATE = "roll,name\n1,Example Student One\n2,Example Student Two\n";

/** Split text into rows of cells. Handles quotes, doubled quotes, CRLF and a BOM. */
export function parseDelimited(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : firstLine.includes(";") && !firstLine.includes(",")
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"' && cell === "") quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const ROLL_HEADERS = [
  "roll",
  "roll no",
  "roll number",
  "rollno",
  "no",
  "sr",
  "sr no",
  "क्रमांक",
  "रोल",
  "रोल नंबर",
  "क्र",
];
const NAME_HEADERS = ["name", "student", "student name", "नाम", "छात्र", "छात्र का नाम", "विद्यार्थी"];

const norm = (s: string) => s.trim().toLowerCase().replace(/[.:#]/g, "").replace(/\s+/g, " ");

export interface RosterRow {
  roll: string;
  name: string;
}

export interface RosterProblem {
  /** 1-based line in the source. */
  line: number;
  reason: "no-name" | "duplicate-roll" | "too-long" | "duplicate-name";
  text: string;
}

export interface RosterParse {
  rows: RosterRow[];
  problems: RosterProblem[];
  /** True when the first row was read as column names. */
  hadHeader: boolean;
}

/**
 * Read a roster. Columns are found by header ("roll", "name", or Hindi equivalents);
 * without a header, one column means names only and two mean roll then name.
 * Rows without a name, repeated roll numbers and absurdly long cells are skipped
 * and reported; nothing is guessed.
 */
export function parseRoster(text: string): RosterParse {
  const all = parseDelimited(text);
  const problems: RosterProblem[] = [];
  const first = all[0]?.map(norm) ?? [];
  let rollCol = first.findIndex((h) => ROLL_HEADERS.includes(h));
  let nameCol = first.findIndex((h) => NAME_HEADERS.includes(h));
  const hadHeader = nameCol !== -1;
  if (!hadHeader) {
    const width = Math.max(0, ...all.map((r) => r.filter((c) => c.trim() !== "").length));
    rollCol = width >= 2 ? 0 : -1;
    nameCol = width >= 2 ? 1 : 0;
  }
  const rows: RosterRow[] = [];
  const rolls = new Set<string>();
  const names = new Set<string>();
  all.forEach((cells, index) => {
    if (hadHeader && index === 0) return;
    const line = index + 1;
    if (cells.every((c) => c.trim() === "")) return;
    const name = (cells[nameCol] ?? "").trim().replace(/\s+/g, " ");
    let roll = rollCol >= 0 ? (cells[rollCol] ?? "").trim() : "";
    const raw = cells.join(", ");
    if (!name) {
      problems.push({ line, reason: "no-name", text: raw });
      return;
    }
    if (name.length > 80 || roll.length > 12) {
      problems.push({ line, reason: "too-long", text: raw });
      return;
    }
    if (!roll) roll = String(rows.length + 1);
    if (rolls.has(roll)) {
      problems.push({ line, reason: "duplicate-roll", text: raw });
      return;
    }
    if (names.has(name.toLowerCase())) {
      // Two children can share a name; keep both, but say so.
      problems.push({ line, reason: "duplicate-name", text: raw });
    }
    rolls.add(roll);
    names.add(name.toLowerCase());
    rows.push({ roll, name });
  });
  return { rows, problems, hadHeader };
}

/** Quote a cell for CSV, and defuse spreadsheet formulas in text cells. */
export function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s) && s !== "-") s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text with a BOM, so spreadsheet apps open Hindi names correctly. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null>>): string {
  return `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
