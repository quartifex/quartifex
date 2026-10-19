// "Work with us": emails a submission to our inbox. Nothing is stored. The provider
// key and the addresses come from environment variables; nothing secret is in the repo.
//   KAKSHA_RESEND_KEY    Resend API key
//   KAKSHA_CONTACT_TO    where submissions go
//   KAKSHA_CONTACT_FROM  a sender on a domain verified with Resend
import { PRODUCT_NAME } from "../../../config";

export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 5;
// A basic per-instance limit: enough to stop a loop of form posts, not a firewall.
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  // Honeypot: people never see this field. Pretend success so bots learn nothing.
  if (clean(body.website, 200)) return Response.json({ ok: true });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return Response.json({ ok: false, error: "slow-down" }, { status: 429 });

  const form = {
    name: clean(body.name, 120),
    email: clean(body.email, 200),
    organisation: clean(body.organisation, 160),
    teachers: clean(String(body.teachers ?? ""), 12),
    need: clean(body.need, 120),
    message: clean(body.message, 3000),
    locale: clean(body.locale, 5),
  };
  if (
    !form.name ||
    !form.organisation ||
    !form.message ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)
  ) {
    return Response.json({ ok: false, error: "missing" }, { status: 400 });
  }

  const key = process.env.KAKSHA_RESEND_KEY;
  const to = process.env.KAKSHA_CONTACT_TO;
  const from = process.env.KAKSHA_CONTACT_FROM;
  if (!key || !to || !from)
    return Response.json({ ok: false, error: "not-configured" }, { status: 503 });

  const lines = [
    ["Name", form.name],
    ["Email", form.email],
    ["Organisation", form.organisation],
    ["Teachers", form.teachers || "–"],
    ["Need", form.need],
    ["Page language", form.locale],
  ];
  const text = `${lines.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${form.message}\n`;
  const html = `<table>${lines.map(([k, v]) => `<tr><th align="left">${k}</th><td>${escapeHtml(v ?? "")}</td></tr>`).join("")}</table><p style="white-space:pre-wrap">${escapeHtml(form.message)}</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: form.email,
      subject: `${PRODUCT_NAME}: ${form.need || "enquiry"} from ${form.organisation}`,
      text,
      html,
    }),
  }).catch(() => null);
  if (!res?.ok) return Response.json({ ok: false, error: "send-failed" }, { status: 502 });
  return Response.json({ ok: true });
}
