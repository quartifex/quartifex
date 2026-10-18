import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BackupError, decryptBackup, encryptBackup } from "./backup";
import { csvCell, parseDelimited, parseRoster, toCsv } from "./csv";
import { parseTemplate } from "./template";

const examples = ["example-primary-maths-g3", "example-reading-fluency", "example-writing"];

describe("templates", () => {
  for (const name of examples) {
    it(`ships ${name} as a valid, labelled example`, () => {
      const json = JSON.parse(
        readFileSync(new URL(`../../public/templates/${name}.json`, import.meta.url), "utf8"),
      );
      const result = parseTemplate(json);
      expect(result.ok, result.ok ? "" : result.errors.join("\n")).toBe(true);
      if (result.ok) {
        expect(result.value.example).toBe(true);
        expect(result.value.notes).toMatch(/not an official/i);
      }
    });
  }

  it("explains what is wrong, and where", () => {
    const result = parseTemplate({
      format: "kaksha-template",
      version: 1,
      id: "Bad Id",
      title: "x",
      subject: "Maths",
      kind: "key",
      items: [{ label: "Q1", type: "choice" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.startsWith("id:"))).toBe(true);
      expect(result.errors.some((e) => e.startsWith("items.0.key:"))).toBe(true);
    }
  });

  it("refuses repeated level scores in a criterion", () => {
    const result = parseTemplate({
      format: "kaksha-template",
      version: 1,
      id: "r",
      title: "r",
      subject: "s",
      kind: "rubric",
      items: [
        {
          label: "c",
          levels: [
            { score: 1, label: "a" },
            { score: 1, label: "b" },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
  });
});

describe("encrypted backup", () => {
  const tables = {
    schools: [{ id: "s", name: "Nimbu Vidyalaya (fictional)" }],
    classes: [{ id: "c", schoolId: "s", grade: "4", section: "B", year: "2026-27" }],
    students: [{ id: "p", classId: "c", roll: "1", name: "टिंकू तारा", active: true }],
    assessments: [],
    responses: [],
    sittings: [],
  };

  it("round-trips with the right passphrase", async () => {
    const env = await encryptBackup(tables, "chalk and slate", 1000);
    expect(env.data).not.toContain("टिंकू");
    const back = await decryptBackup(JSON.stringify(env), "chalk and slate");
    expect(back.tables).toEqual(tables);
  });

  it("fails cleanly with the wrong passphrase", async () => {
    const env = await encryptBackup(tables, "chalk and slate", 1000);
    await expect(decryptBackup(JSON.stringify(env), "chalk and slates")).rejects.toMatchObject({
      code: "wrong-passphrase",
    });
  });

  it("refuses short passphrases, other files and newer versions", async () => {
    await expect(encryptBackup(tables, "short", 1000)).rejects.toBeInstanceOf(BackupError);
    await expect(decryptBackup("not json", "whatever1")).rejects.toMatchObject({
      code: "not-a-backup",
    });
    await expect(
      decryptBackup(JSON.stringify({ format: "kaksha-backup", version: 2, data: "" }), "whatever1"),
    ).rejects.toMatchObject({ code: "newer-version" });
  });

  it("detects a tampered file", async () => {
    const env = await encryptBackup(tables, "chalk and slate", 1000);
    const bytes = atob(env.data);
    const flipped = btoa(String.fromCharCode(bytes.charCodeAt(0) ^ 1) + bytes.slice(1));
    await expect(
      decryptBackup(JSON.stringify({ ...env, data: flipped }), "chalk and slate"),
    ).rejects.toMatchObject({ code: "wrong-passphrase" });
  });
});

describe("rosters", () => {
  it("reads a CSV with a header, quotes and a BOM", () => {
    const r = parseRoster('﻿Roll No,Name\r\n1,"Rao, Asha"\r\n2,Bunty Kumar\r\n');
    expect(r.hadHeader).toBe(true);
    expect(r.rows).toEqual([
      { roll: "1", name: "Rao, Asha" },
      { roll: "2", name: "Bunty Kumar" },
    ]);
    expect(r.problems).toEqual([]);
  });

  it("reads Hindi headers and tab-separated paste in any column order", () => {
    const r = parseRoster("नाम\tक्रमांक\nमीना\t3\nराजू\t4\n");
    expect(r.rows).toEqual([
      { roll: "3", name: "मीना" },
      { roll: "4", name: "राजू" },
    ]);
  });

  it("numbers a names-only list", () => {
    const r = parseRoster("Asha\nBunty\n\nChintu");
    expect(r.rows.map((x) => x.roll)).toEqual(["1", "2", "3"]);
  });

  it("reports bad rows by line and keeps the good ones", () => {
    const r = parseRoster(`roll,name\n1,Asha\n2,\n1,Bunty\n3,Asha\n4,${"x".repeat(90)}`);
    expect(r.rows.map((x) => x.name)).toEqual(["Asha", "Asha"]);
    expect(r.problems.map((p) => [p.line, p.reason])).toEqual([
      [3, "no-name"],
      [4, "duplicate-roll"],
      [5, "duplicate-name"],
      [6, "too-long"],
    ]);
  });

  it("parses doubled quotes inside cells", () => {
    expect(parseDelimited('a,"say ""hi"""\n')).toEqual([["a", 'say "hi"']]);
  });
});

describe("csv export", () => {
  it("quotes where needed and defuses formulas", () => {
    expect(csvCell("Rao, Asha")).toBe('"Rao, Asha"');
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("-")).toBe("-");
    expect(csvCell(12.5)).toBe("12.5");
    expect(csvCell(null)).toBe("");
  });
  it("starts with a BOM and uses CRLF", () => {
    expect(toCsv([["a", 1]])).toBe("﻿a,1\r\n");
  });
});
