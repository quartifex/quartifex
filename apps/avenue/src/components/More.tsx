"use client";
// "Read more", done properly: a button that opens a section in place (it grows open; it does
// not jump), so the page leads with the point and the visitor decides what to read in full.
// A link to anything inside opens it first. Without script everything is simply open.
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import s from "./More.module.css";

export function More({
  label,
  hint,
  children,
  tone,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  tone?: "paper";
}) {
  const id = useId();
  const body = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Closed once script runs, unless the address points inside.
    const inside = () => {
      const h = location.hash.slice(1);
      if (!h) return false;
      const el = document.getElementById(h);
      return Boolean(el && body.current?.contains(el));
    };
    setOpen(inside());
    setReady(true);
    const onHash = () => {
      if (inside()) {
        setOpen(true);
        requestAnimationFrame(() =>
          document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "center" }),
        );
      }
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href^='#']");
      if (!a) return;
      const el = document.getElementById(a.getAttribute("href")?.slice(1) ?? "");
      if (el && body.current?.contains(el)) setOpen(true);
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <div
      className={s.more}
      data-open={open ? "" : undefined}
      data-ready={ready ? "" : undefined}
      data-tone={tone}
    >
      <button
        type="button"
        className={s.toggle}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={s.toggleText}>
          <strong>{label}</strong>
          {hint ? <small>{hint}</small> : null}
        </span>
        <span className={s.icon} aria-hidden="true" />
      </button>
      <div id={id} className={s.body} inert={!open}>
        <div ref={body} className={s.inner}>
          {children}
        </div>
      </div>
    </div>
  );
}
