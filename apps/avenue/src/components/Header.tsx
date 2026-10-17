"use client";
// The bar across the top. Left: the lockup. Centre: the chapter rail, one dot per chapter of
// the drive, the current one marked with the lane mark (AVARA's progress line, in our mark).
// Right: the sections as joined tiles on glass, the last one the call to action.
import { useEffect, useState } from "react";
import { Arrow } from "./Btn";
import s from "./Header.module.css";
import { Lockup, Mark } from "./Logo";

const LINKS = [
  { href: "#demo", label: "Demo" },
  { href: "#fleets", label: "Fleets" },
  { href: "#platform", label: "Platform" },
  { href: "#design", label: "Research" },
  { href: "#docs", label: "Docs" },
];

/** The chapters the rail shows, in page order, with the anchor each dot jumps to. */
const RAIL = [
  { id: "hero", label: "Blue hour", href: "#top" },
  { id: "cabin", label: "Into the cabin", href: "#ch-cabin" },
  { id: "seats", label: "Every seat", href: "#ch-seats" },
  { id: "driver", label: "Driver", href: "#ch-driver" },
  { id: "share", label: "Send to the back", href: "#ch-share" },
  { id: "climate", label: "Climate", href: "#ch-climate" },
  { id: "road", label: "The road", href: "#ch-road" },
  { id: "sos", label: "SOS", href: "#ch-sos" },
  { id: "demo", label: "Live demo", href: "#demo" },
];

/** Which rail stop a chapter id belongs to (the problem beat sits with the night drive). */
const STOP: Record<string, string> = { problem: "hero" };

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [chapter, setChapter] = useState("hero");
  const [inJourney, setInJourney] = useState(true);
  const [theme, setTheme] = useState<"cabin" | "paper">("cabin");

  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > 40);
      const c = document.documentElement.dataset.chapter ?? "hero";
      setChapter(STOP[c] ?? c);
      const j = document.getElementById("journey");
      if (j) setInJourney(j.getBoundingClientRect().bottom > window.innerHeight * 0.5);
      // Take the theme of whatever section is passing under the bar.
      const under = document
        .elementsFromPoint(window.innerWidth / 2, 36)
        .find((e) => !e.closest("header"));
      setTheme(
        under?.closest("[data-theme]")?.getAttribute("data-theme") === "paper" ? "paper" : "cabin",
      );
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Close the menu once a section link has been followed.
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  const current = RAIL.findIndex((r) => r.id === chapter);

  return (
    <header className={s.header} data-theme={theme} data-scrolled={scrolled ? "" : undefined}>
      <div className={s.inner}>
        <a href="#top" className={s.brand} aria-label="AVENUE, back to the top">
          <Lockup height={20} />
        </a>

        <nav className={s.rail} aria-label="Chapters" data-hidden={inJourney ? undefined : ""}>
          <ol>
            {RAIL.map((r, i) => (
              <li key={r.id} data-state={i < current ? "past" : i === current ? "current" : "next"}>
                <a
                  href={r.href}
                  aria-label={r.label}
                  aria-current={i === current ? "step" : undefined}
                >
                  {i === current ? <Mark size={14} small /> : <i />}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <nav aria-label="Sections" className={s.nav} data-open={open ? "" : undefined}>
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
            <li className={s.cta}>
              <a href="#partner">
                Partner with us
                <span className={s.ctaArrow}>
                  <Arrow />
                </span>
              </a>
            </li>
          </ul>
        </nav>
        <button
          type="button"
          className={s.menu}
          aria-expanded={open}
          aria-label="Sections"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
