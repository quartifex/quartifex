"use client";
// The docs as a reader: a sticky list of chapters beside one open chapter at a time, so the
// page never dumps all nine at once. Plain hash links underneath (they work without script,
// where every chapter shows), and a hash in the address opens its chapter.
import { Children, type ReactNode, useEffect, useState } from "react";
import s from "./docs.module.css";

export function DocsNav({
  items,
  children,
}: {
  items: Array<{ id: string; label: string; summary: string }>;
  children: ReactNode;
}) {
  const [current, setCurrent] = useState<string | null>(null);
  const bodies = Children.toArray(children);

  useEffect(() => {
    const fromHash = () => {
      const id = location.hash.slice(1);
      if (items.some((i) => i.id === id)) setCurrent(id);
    };
    fromHash();
    setCurrent((c) => c ?? items[0]?.id ?? null);
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [items]);

  const index = items.findIndex((i) => i.id === current);
  const next = items[index + 1];

  return (
    <>
      <nav className={s.nav} aria-label="Documentation">
        <ol>
          {items.map((i, n) => (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                aria-current={current === i.id ? "location" : undefined}
                onClick={() => setCurrent(i.id)}
              >
                <span className="mono">{String(n + 1).padStart(2, "0")}</span>
                {i.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className={s.content} data-reader={current ? "" : undefined}>
        {items.map((item, n) => (
          <article
            key={item.id}
            id={item.id}
            className={s.article}
            data-open={current === null || current === item.id ? "" : undefined}
          >
            <p className={s.articleSummary}>{item.summary}</p>
            {bodies[n]}
          </article>
        ))}
        {next && current ? (
          <a className={s.nextChapter} href={`#${next.id}`} onClick={() => setCurrent(next.id)}>
            <span className="label">Next</span>
            {next.label} →
          </a>
        ) : null}
      </div>
    </>
  );
}
