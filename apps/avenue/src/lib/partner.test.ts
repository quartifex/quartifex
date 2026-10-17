import { describe, expect, it } from "vitest";
import { checkSubmission, rateLimit } from "./partner";

const good = { name: "Ada", company: "Example Mobility", email: "ada@example.com", model: "pilot" };

describe("partner form", () => {
  it("accepts a complete submission", () => {
    expect(checkSubmission(good).kind).toBe("ok");
  });

  it("treats a filled honeypot as a bot, silently", () => {
    expect(checkSubmission({ ...good, website: "http://spam" }).kind).toBe("bot");
  });

  it("refuses bad email and unknown engagement models", () => {
    expect(checkSubmission({ ...good, email: "nope" }).kind).toBe("invalid");
    expect(checkSubmission({ ...good, model: "free-lunch" }).kind).toBe("invalid");
  });

  it("rate-limits an address after five messages in ten minutes", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) expect(rateLimit("1.2.3.4", now + i)).toBe(true);
    expect(rateLimit("1.2.3.4", now + 10)).toBe(false);
    expect(rateLimit("1.2.3.4", now + 11 * 60 * 1000)).toBe(true);
  });
});
