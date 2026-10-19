"use client";
// An optional PIN for shared phones. It keeps a curious sibling out of the app; it
// does not encrypt the data on the phone, and the docs say so plainly.
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { db } from "../lib/db";
import { useApp } from "./context";
import { Mark } from "./ui";

const UNLOCKED = "kaksha-unlocked";

interface PinRecord {
  salt: string;
  hash: string;
}

async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: 100_000 },
    key,
    256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function setPin(pin: string | null): Promise<void> {
  if (pin === null) {
    await db().settings.delete("pin");
    return;
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const record: PinRecord = {
    salt: btoa(String.fromCharCode(...salt)),
    hash: await hashPin(pin, salt),
  };
  await db().settings.put({ key: "pin", value: record });
  sessionStorage.setItem(UNLOCKED, "1");
}

export async function hasPin(): Promise<boolean> {
  return Boolean(await db().settings.get("pin"));
}

async function checkPin(pin: string): Promise<boolean> {
  const row = await db().settings.get("pin");
  const rec = row?.value as PinRecord | undefined;
  if (!rec) return true;
  const salt = Uint8Array.from(atob(rec.salt), (c) => c.charCodeAt(0));
  return (await hashPin(pin, salt)) === rec.hash;
}

export function PinGate({ children }: { children: ReactNode }) {
  const { t } = useApp();
  const [state, setState] = useState<"checking" | "locked" | "open">("checking");
  const [pin, setPinValue] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(UNLOCKED) === "1") {
      setState("open");
      return;
    }
    hasPin()
      .then((locked) => setState(locked ? "locked" : "open"))
      .catch(() => setState("open"));
  }, []);

  if (state === "open") return <>{children}</>;
  if (state === "checking") return <div aria-busy="true" style={{ minHeight: "60svh" }} />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await checkPin(pin)) {
      sessionStorage.setItem(UNLOCKED, "1");
      setState("open");
    } else {
      setWrong(true);
      setPinValue("");
    }
  };

  return (
    <main className="lock">
      <form className="lock__box" onSubmit={submit}>
        <Mark size={88} />
        <h1>{t("pin.title")}</h1>
        <label className="field" style={{ width: "100%" }}>
          <span className="label">{t("pin.enter")}</span>
          <input
            className="input num"
            style={{ textAlign: "center", fontSize: "1.6rem", letterSpacing: "0.4em" }}
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]*"
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setWrong(false);
              setPinValue(e.target.value.replace(/\D/g, ""));
            }}
            aria-invalid={wrong}
            aria-describedby={wrong ? "pin-wrong" : undefined}
            // biome-ignore lint/a11y/noAutofocus: the lock screen has one job
            autoFocus
          />
        </label>
        {wrong ? (
          <p id="pin-wrong" className="error" role="alert">
            {t("pin.wrong")}
          </p>
        ) : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={pin.length < 4}>
          {t("pin.unlock")}
        </button>
        <p className="small muted">{t("pin.forgot")}</p>
      </form>
    </main>
  );
}
