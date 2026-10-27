"use client";

import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import styles from "./Auth.module.css";

type Mode = "signin" | "signup" | "reset";
type Provider = "google" | "github";

function safeNext(next: string | undefined): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.5 12.27c0-.8-.07-1.56-.2-2.3H12v4.35h5.9a5.05 5.05 0 0 1-2.19 3.31v2.75h3.54c2.07-1.9 3.25-4.72 3.25-8.11Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.67l-3.54-2.75c-.98.66-2.24 1.05-3.74 1.05-2.87 0-5.3-1.94-6.17-4.55H2.17v2.84A11 11 0 0 0 12 23Z"
    />
    <path
      fill="#FBBC05"
      d="M5.83 14.08a6.6 6.6 0 0 1 0-4.16V7.08H2.17a11 11 0 0 0 0 9.84l3.66-2.84Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.37c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.1 14.97 1 12 1A11 11 0 0 0 2.17 7.08l3.66 2.84C6.7 7.31 9.13 5.37 12 5.37Z"
    />
  </svg>
);

const GithubMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

/** The kit's floating-label field. */
function Field({
  id,
  label,
  ...input
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <div className="in">
        <input id={id} placeholder=" " {...input} />
        <label htmlFor={id}>{label}</label>
      </div>
    </div>
  );
}

/** Sign in, create an account or reset a password. Shared by the dialog and the /login page. */
export function AuthForm({ next, onDone }: { next?: string; onDone?: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [withEmail, setWithEmail] = useState(false);
  const uid = useId();

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;

  const oauth = async (provider: Provider) => {
    setBusy(true);
    setMessage(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setBusy(false);
      setMessage({ kind: "error", text: error.message });
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/account/security`,
      });
      setBusy(false);
      setMessage(
        error
          ? { kind: "error", text: error.message }
          : { kind: "ok", text: "If that address has an account, a reset link is on its way." },
      );
      return;
    }
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo() },
      });
      setBusy(false);
      if (error) return setMessage({ kind: "error", text: error.message });
      if (data.session) {
        onDone?.();
        window.location.assign(safeNext(next));
        return;
      }
      return setMessage({
        kind: "ok",
        text: "Check your inbox to confirm your email, then sign in.",
      });
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage({ kind: "error", text: error.message });
    onDone?.();
    window.location.assign(safeNext(next));
  };

  const magicLink = async () => {
    if (!email) return setMessage({ kind: "error", text: "Enter your email first." });
    setBusy(true);
    setMessage(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setBusy(false);
    setMessage(
      error
        ? { kind: "error", text: error.message }
        : { kind: "ok", text: "Magic link sent. Open it on this device to sign in." },
    );
  };

  const heading =
    mode === "signup"
      ? "Create your account"
      : mode === "reset"
        ? "Reset your password"
        : "Design toolkit for the era of motion";

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{heading}</h2>

      {mode !== "reset" && (
        <div className={styles.providers}>
          <Button variant="outline" disabled={busy} onClick={() => oauth("google")}>
            <GoogleMark /> Continue with Google
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => oauth("github")}>
            <GithubMark /> Continue with GitHub
          </Button>
          {!withEmail && (
            <Button variant="soft" onClick={() => setWithEmail(true)}>
              Continue with Email
            </Button>
          )}
        </div>
      )}

      {(withEmail || mode === "reset") && (
        <form className={styles.form} onSubmit={submit}>
          <Field
            id={`${uid}-email`}
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== "reset" && (
            <Field
              id={`${uid}-password`}
              label="Password (8+ characters)"
              type="password"
              name="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <Button type="submit" cta disabled={busy}>
            {mode === "signup"
              ? "Create account"
              : mode === "reset"
                ? "Send reset link"
                : "Sign in"}
          </Button>
          {mode === "signin" && (
            <button type="button" className={styles.link} onClick={magicLink} disabled={busy}>
              Email me a magic link instead
            </button>
          )}
        </form>
      )}

      {message && (
        <p className={styles.message} data-kind={message.kind} role="status">
          {message.text}
        </p>
      )}

      <div className={styles.switch}>
        {mode === "signin" && (
          <>
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                setMode("signup");
                setWithEmail(true);
                setMessage(null);
              }}
            >
              New here? Create an account
            </button>
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                setMode("reset");
                setMessage(null);
              }}
            >
              Forgot password?
            </button>
          </>
        )}
        {mode !== "signin" && (
          <button
            type="button"
            className={styles.link}
            onClick={() => {
              setMode("signin");
              setMessage(null);
            }}
          >
            Back to sign in
          </button>
        )}
      </div>

      <p className={styles.fine}>
        By continuing, you agree to the Quartifex <a href="https://quartifex.com/terms">Terms</a>{" "}
        and <a href="https://quartifex.com/privacy">Privacy Policy</a>.
      </p>
    </div>
  );
}
