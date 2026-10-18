// Rubric and answer-key templates: plain JSON files that anyone can write, share
// and check against the published schema (/schema/template.v1.json).
import { z } from "zod";

const choice = z.enum(["A", "B", "C", "D"]);

const keyItem = z
  .object({
    label: z.string().min(1).max(40),
    domain: z.string().max(60).default(""),
    type: z.enum(["choice", "rightwrong"]).default("choice"),
    key: choice.nullable().default(null),
    marks: z.number().int().min(1).max(100).default(1),
  })
  .refine((item) => item.type === "rightwrong" || item.key !== null, {
    message: "A choice question needs its correct answer in `key` (A, B, C or D).",
    path: ["key"],
  });

const level = z.object({
  score: z.number().int().min(0).max(100),
  label: z.string().min(1).max(40),
  descriptor: z.string().max(400).default(""),
});

const criterion = z
  .object({
    label: z.string().min(1).max(80),
    domain: z.string().max(60).default(""),
    levels: z.array(level).min(2).max(8),
  })
  .refine((c) => new Set(c.levels.map((l) => l.score)).size === c.levels.length, {
    message: "Each level in a criterion needs a different score.",
    path: ["levels"],
  });

const base = {
  format: z.literal("kaksha-template"),
  version: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "Use lowercase letters, numbers and dashes."),
  title: z.string().min(1).max(120),
  subject: z.string().min(1).max(60),
  /** BCP 47 tag of the text inside the template, e.g. "en" or "hi". */
  language: z.string().min(2).max(20).default("en"),
  /** True for the examples we ship. They are examples, not official curricula. */
  example: z.boolean().default(false),
  author: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
};

export const keyTemplate = z.object({
  ...base,
  kind: z.literal("key"),
  items: z.array(keyItem).min(1).max(200),
});

export const rubricTemplate = z.object({
  ...base,
  kind: z.literal("rubric"),
  items: z.array(criterion).min(1).max(40),
});

export const template = z.discriminatedUnion("kind", [keyTemplate, rubricTemplate]);

export type Template = z.output<typeof template>;
export type TemplateInput = z.input<typeof template>;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/** Check a template file. Errors are plain sentences with the place they point to. */
export function parseTemplate(json: unknown): ParseResult<Template> {
  const result = template.safeParse(json);
  if (result.success) return { ok: true, value: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((issue) => {
      const where = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return `${where}${issue.message}`;
    }),
  };
}

export function templateJsonSchema(): unknown {
  return z.toJSONSchema(template, { io: "input" });
}
