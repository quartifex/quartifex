"use client";

// The Lab seeds as a gallery: a poster per card (the seed itself, drawn small, or its icon
// until it is built), its tag, a "New" mark for recent drops, and a list view for scanning
// names. Arrow keys move between cards on top of the normal tab order; Enter opens one.
import Link from "next/link";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { SeedEntry } from "@/lib/seeds";
import { posters } from "@/seeds/posters";
import styles from "./LabGallery.module.css";

type View = "grid" | "list";
const VIEW_KEY = "qx-lab-view";

/** How many cards sit in one row of the grid, read from the laid-out columns. */
function columns(list: HTMLElement): number {
  const tracks = getComputedStyle(list).gridTemplateColumns.split(" ").filter(Boolean);
  return Math.max(1, tracks.length);
}

export function LabGallery({ entries }: { entries: SeedEntry[] }) {
  const [view, setView] = useState<View>("grid");
  const [ready, setReady] = useState(false);
  const list = useRef<HTMLOListElement>(null);

  // A per-visitor convenience only: storage may be unavailable, and the grid is the default.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      // Private mode: stay on the grid.
    }
    setReady(true);
  }, []);
  const choose = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // The choice lasts for this page.
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const el = list.current;
    if (!el || event.altKey || event.ctrlKey || event.metaKey) return;
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("a[data-card-link]"));
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (at < 0) return;
    const step = view === "grid" ? columns(el) : 1;
    const to = {
      ArrowRight: at + 1,
      ArrowLeft: at - 1,
      ArrowDown: at + step,
      ArrowUp: at - step,
      Home: 0,
      End: links.length - 1,
    }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    links[Math.min(Math.max(to, 0), links.length - 1)]?.focus();
  };

  const built = entries.filter((e) => e.built).length;
  return (
    <section className={styles.gallery} aria-labelledby="lab-title">
      <div className={styles.head}>
        <div>
          <h1 id="lab-title" className={styles.title}>
            Lab
          </h1>
          <p className={styles.lede}>
            Small, finished experiments: {entries.length} seeds, {built} built. Open one to play
            with it. Arrow keys move between cards, Enter opens one, Escape on a seed comes back
            here.
          </p>
        </div>
        <fieldset className={styles.views}>
          <legend className="visually-hidden">View</legend>
          {(["grid", "list"] as const).map((v) => (
            <label key={v} className={styles.view}>
              <input
                type="radio"
                name="lab-view"
                value={v}
                checked={view === v}
                onChange={() => choose(v)}
              />
              <span>{v === "grid" ? "Grid" : "List"}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <ol
        ref={list}
        className={view === "grid" ? styles.grid : styles.list}
        onKeyDown={onKeyDown}
        data-view={view}
        data-ready={ready || undefined}
        data-testid="lab-gallery"
      >
        {entries.map((entry) => {
          const Poster = posters[entry.name];
          return (
            <li key={entry.id} className={styles.card} data-built={entry.built || undefined}>
              {view === "grid" &&
                (Poster && entry.built ? (
                  <Poster />
                ) : (
                  <div
                    className={styles.icon}
                    aria-hidden="true"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from assets/icons in this repo
                    dangerouslySetInnerHTML={{ __html: entry.icon }}
                  />
                ))}
              <div className={styles.meta}>
                <span className={styles.tag}>{entry.tag}</span>
                <span className={styles.chips}>
                  {entry.isNew && (
                    <span className={styles.new} data-testid="lab-new">
                      New
                    </span>
                  )}
                  <span className={styles.chip} data-built={entry.built || undefined}>
                    {entry.built ? "Built" : "Soon"}
                  </span>
                </span>
              </div>
              <h2 className={styles.name}>
                <Link href={entry.href} className={styles.link} data-card-link="">
                  {entry.name}
                </Link>
              </h2>
              <p className={styles.note}>{entry.description}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
