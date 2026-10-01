"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./sample.module.css";

export function SamplePage() {
  const heavy = useSearchParams().get("heavy") === "1";
  const [banner, setBanner] = useState(false);

  useEffect(() => {
    if (!heavy) return;
    // A late banner that pushes everything down: layout shift.
    const timer = window.setTimeout(() => setBanner(true), 800);
    // Work on every scroll event: long frames.
    const onScroll = () => {
      const until = performance.now() + 60;
      while (performance.now() < until) {
        // Deliberately blocking.
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [heavy]);

  const buy = () => {
    if (!heavy) return;
    const until = performance.now() + 250;
    while (performance.now() < until) {
      // A slow click handler: poor interaction latency.
    }
  };

  return (
    <main className={styles.page}>
      {banner && <div className={styles.banner}>A banner that arrived late</div>}
      {["One", "Two", "Three"].map((name) => (
        <section key={name} className={styles.section} data-chapter={name}>
          <p className={styles.kicker}>Test page · {heavy ? "heavy" : "light"}</p>
          <h1>Chapter {name}</h1>
          <button type="button" className={styles.button} onClick={buy}>
            Buy
          </button>
        </section>
      ))}
    </main>
  );
}
