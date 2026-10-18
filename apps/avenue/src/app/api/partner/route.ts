// The partner form's endpoint: validates, drops bots (honeypot), rate-limits by address, and
// emails the submission through Resend's HTTP API. No secret is in the repository: the key
// and addresses come from environment variables set in Vercel (see the README):
//   RESEND_API_KEY   the email provider key
//   PARTNER_INBOX    where submissions go (defaults to hello@quartifex.com)
//   PARTNER_FROM     a sender on a domain verified with the provider
// Every subject ends in "AVENUE", so the studio's inbox can route them. Without a key the
// endpoint answers 503 with a ready-made email, and the form offers to open it instead.
import { checkSubmission, rateLimit } from "@/lib/partner";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(ip, Date.now())) {
    return Response.json(
      { message: "Too many messages from here. Please try again in a few minutes." },
      { status: 429 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "That did not arrive in one piece. Please try again." },
      { status: 400 },
    );
  }
  const result = checkSubmission(body);
  if (result.kind === "bot") return Response.json({ message: "Thank you." });
  if (result.kind === "invalid") return Response.json({ message: result.message }, { status: 422 });

  const key = process.env.RESEND_API_KEY;
  const to = process.env.PARTNER_INBOX || "hello@quartifex.com";
  const from = process.env.PARTNER_FROM;
  const s = result.submission;
  const subject = `Partner enquiry from ${s.company} (${s.model}) · AVENUE`;
  const text = [
    `Name: ${s.name}`,
    `Company: ${s.company}`,
    `Role: ${s.role || "-"}`,
    `Email: ${s.email}`,
    `Engagement: ${s.model}`,
    "",
    s.message || "(no message)",
    "",
    "Sent from avenue.quartifex.com",
  ].join("\n");
  if (!key || !from) {
    return Response.json(
      {
        message: "The form cannot send by itself yet. Your email app can send it instead.",
        mailto: `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
      },
      { status: 503 },
    );
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: s.email,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    return Response.json(
      { message: "We could not send that just now. Please try again later." },
      { status: 502 },
    );
  }
  return Response.json({ message: "Thank you. We will reply within a few working days." });
}
