"use client";
import { type FormEvent, useState } from "react";
import type { Copy, SiteLocale } from "./copy";

export function ContactForm({ copy, locale }: { copy: Copy["schools"]; locale: SiteLocale }) {
  const [state, setState] = useState<
    "idle" | "sending" | "ok" | "fail" | "off" | "offline" | "slow" | "missing"
  >("idle");
  const f = copy.fields;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    // Never clear what someone typed unless it was sent.
    if (!navigator.onLine) return setState("offline");
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale }),
      });
      if (res.ok) {
        setState("ok");
        form.reset();
      } else if (res.status === 503) setState("off");
      else if (res.status === 429) setState("slow");
      else if (res.status === 400) setState("missing");
      else setState("fail");
    } catch {
      setState(navigator.onLine ? "fail" : "offline");
    }
  };

  return (
    <form className="contact" onSubmit={submit}>
      <div className="contact__row">
        <label>
          <span>{f.name}</span>
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
        <label>
          <span>{copy.email}</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" />
        </label>
      </div>
      <div className="contact__row">
        <label>
          <span>{f.org}</span>
          <input name="organisation" required maxLength={160} autoComplete="organization" />
        </label>
        <label>
          <span>{f.teachers}</span>
          <input name="teachers" type="number" min={1} max={1000000} inputMode="numeric" />
        </label>
      </div>
      <label>
        <span>{f.need}</span>
        <select name="need" required defaultValue={copy.needs[0]}>
          {copy.needs.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label>
        <span>{f.message}</span>
        <textarea name="message" required maxLength={3000} rows={5} />
      </label>
      {/* Left empty by people; filled by bots. */}
      <label className="contact__trap" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <p className="contact__note">{copy.note}</p>
      <button type="submit" className="cta" disabled={state === "sending"}>
        {state === "sending" ? f.sending : f.send}
      </button>
      <p role="status" aria-live="polite" className="contact__status">
        {state === "idle" || state === "sending" ? "" : copy.status[state]}
      </p>
    </form>
  );
}
