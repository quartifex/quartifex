"use client";
// The partner form: posts to /api/partner, which emails the submission. A hidden honeypot
// field and a rate limit keep bots out; errors are announced and tied to their fields.
import { useId, useState } from "react";
import s from "./Collaborate.module.css";

type Status = { kind: "idle" | "sending" | "sent" | "error"; message?: string };

export function PartnerForm({ models }: { models: Array<{ id: string; name: string }> }) {
  const id = useId();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const next: Record<string, string> = {};
    if (!data.name?.trim()) next.name = "Enter your name.";
    if (!data.company?.trim()) next.company = "Enter your company.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email ?? ""))
      next.email = "Enter an email address we can reply to.";
    if (!data.model) next.model = "Choose how you would like to work with us.";
    setErrors(next);
    if (Object.keys(next).length) {
      setStatus({ kind: "error", message: "Some fields need attention." });
      const first = form.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`);
      first?.focus();
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(body.message ?? "Something went wrong. Please try again.");
      form.reset();
      setStatus({
        kind: "sent",
        message: body.message ?? "Thank you. We will reply within a few working days.",
      });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Something went wrong.",
      });
    }
  }

  const field = (name: string) => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
  });
  const error = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className={s.error}>
        {errors[name]}
      </p>
    ) : null;

  return (
    <form
      className={s.form}
      noValidate
      aria-labelledby={`${id}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      <h3 id={`${id}-title`} className="h3">
        Start a conversation
      </h3>
      <div className={s.fields}>
        <div className={s.field}>
          <label htmlFor={`${id}-name`}>Name</label>
          <input {...field("name")} autoComplete="name" required />
          {error("name")}
        </div>
        <div className={s.field}>
          <label htmlFor={`${id}-company`}>Company</label>
          <input {...field("company")} autoComplete="organization" required />
          {error("company")}
        </div>
        <div className={s.field}>
          <label htmlFor={`${id}-role`}>
            Role <span className={s.optional}>(optional)</span>
          </label>
          <input {...field("role")} autoComplete="organization-title" />
        </div>
        <div className={s.field}>
          <label htmlFor={`${id}-email`}>Email</label>
          <input {...field("email")} type="email" autoComplete="email" required />
          {error("email")}
        </div>
      </div>
      <fieldset
        className={s.modelPick}
        aria-describedby={errors.model ? `${id}-model-error` : undefined}
      >
        <legend>How would you like to work with us?</legend>
        {models.map((m) => (
          <label key={m.id} className={s.modelOption}>
            <input type="radio" name="model" value={m.id} />
            <span>{m.name}</span>
          </label>
        ))}
        <label className={s.modelOption}>
          <input type="radio" name="model" value="unsure" />
          <span>Not sure yet</span>
        </label>
        {error("model")}
      </fieldset>
      <div className={s.field}>
        <label htmlFor={`${id}-message`}>
          Message <span className={s.optional}>(optional)</span>
        </label>
        <textarea {...field("message")} rows={4} />
      </div>
      {/* A honeypot: hidden from people and assistive technology, filled in only by bots. */}
      <div className={s.honey} aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className={s.submitRow}>
        <button
          className="btn"
          data-variant="primary"
          type="submit"
          disabled={status.kind === "sending"}
        >
          {status.kind === "sending" ? "Sending…" : "Send"}
        </button>
        <p className={s.status} role="status" aria-live="polite" data-kind={status.kind}>
          {status.message ?? ""}
        </p>
      </div>
      <p className={s.privacy}>We use these details only to reply to you.</p>
    </form>
  );
}
