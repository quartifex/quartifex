"use client";
// The bar across the top: the wordmark, the page's sections and the one call to action. It
// is clear over the hero and gains a surface once the page scrolls.
import Image from "next/image";
import { useEffect, useState } from "react";
import s from "./Header.module.css";

const LINKS = [
  { href: "#demo", label: "Demo" },
  { href: "#design", label: "Design" },
  { href: "#docs", label: "Docs" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={s.header} data-scrolled={scrolled ? "" : undefined}>
      <div className={s.inner}>
        <a href="#top" className={s.brand} aria-label="AVENUE, back to the top">
          <Image
            src="/brand/avenue-logo.svg"
            alt=""
            width={110}
            height={12}
            unoptimized
            className={s.logo}
          />
        </a>
        <nav aria-label="Sections" className={s.nav} data-open={open ? "" : undefined}>
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={s.actions}>
          <a href="#docs" className={s.docsLink}>
            Read the docs
          </a>
          <a className="btn" data-variant="primary" href="#partner">
            Partner with us
          </a>
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
      </div>
    </header>
  );
}
