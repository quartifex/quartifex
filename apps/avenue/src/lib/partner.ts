// Pure checks for the partner form, shared by the route and its tests.

export const MODEL_IDS = ["licence", "pilot", "custom", "unsure"] as const;

export type Submission = {
  name: string;
  company: string;
  role: string;
  email: string;
  model: (typeof MODEL_IDS)[number];
  message: string;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function checkSubmission(
  body: unknown,
): { kind: "ok"; submission: Submission } | { kind: "bot" } | { kind: "invalid"; message: string } {
  if (!body || typeof body !== "object") return { kind: "invalid", message: "Missing details." };
  const b = body as Record<string, unknown>;
  // The honeypot: a field hidden from people. Anything in it is a bot; answer as if it worked.
  if (str(b.website, 200)) return { kind: "bot" };
  const submission = {
    name: str(b.name, 120),
    company: str(b.company, 160),
    role: str(b.role, 120),
    email: str(b.email, 200),
    model: str(b.model, 20) as Submission["model"],
    message: str(b.message, 4000),
  };
  if (!submission.name || !submission.company)
    return { kind: "invalid", message: "Name and company are needed." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email))
    return { kind: "invalid", message: "Enter an email address we can reply to." };
  if (!MODEL_IDS.includes(submission.model))
    return { kind: "invalid", message: "Choose how you would like to work with us." };
  return { kind: "ok", submission };
}

// A basic rate limit: 5 messages per address per 10 minutes. It lives in the serverless
// instance's memory, so it resets when the instance does; it stops floods, not determined abuse.
const WINDOW = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

export function rateLimit(ip: string, now: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
