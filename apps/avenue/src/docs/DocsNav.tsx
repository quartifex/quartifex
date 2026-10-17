"use client";
// The docs' sticky sub-navigation: plain hash links (it works without script), with the
// section in view marked as current.
import { useEffect, useState } from "react";
import s from "./docs.module.css";

export function DocsNav({ items }: { items: Array<{ id: string; label: string }> }) {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = items.find((i) => seen.get(i.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    for (const i of items) {
      const el = document.getElementById(i.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [items]);
  return (
    <nav className={s.nav} aria-label="Documentation">
      <ol>
        {items.map((i, n) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={current === i.id ? "location" : undefined}>
              <span className="mono">{String(n + 1).padStart(2, "0")}</span>
              {i.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
