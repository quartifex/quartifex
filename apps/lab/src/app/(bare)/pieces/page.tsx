import type { Metadata } from "next";
import Link from "next/link";
import styles from "./pieces.module.css";

export const metadata: Metadata = {
  title: "Pieces",
  description: "Full-screen works from the Quartifex Lab: one idea each, made to be played with.",
};

const pieces = [
  {
    slug: "sandhya",
    title: "Sandhyā",
    line: "Dusk at sea, and a quarter of a million starlings turning as one.",
  },
  {
    slug: "prithvi",
    title: "Prithvi",
    line: "The Earth, with a sea level you can move.",
  },
  {
    slug: "brahmand",
    title: "Brahmānd",
    line: "Every photograph is a universe if you step to one side of it.",
  },
  {
    slug: "parvat",
    title: "Parvat",
    line: "A mountain range that does not exist, drawn from millions of points.",
  },
  {
    slug: "niyam",
    title: "Niyam",
    line: "Three short equations, and no two threads ever take the same path.",
  },
  { slug: "nada", title: "Nāda", line: "Sand on a plate finds where the silence is." },
  {
    slug: "syahi",
    title: "Syāhi",
    line: "Ink in still water. Stir it, and you can't take it back.",
  },
];

export default function Page() {
  return (
    <main className={styles.page}>
      <p className={styles.mono}>Quartifex Lab · Personal Concepts</p>
      <h1 className={styles.title}>Pieces</h1>
      <ol className={styles.list}>
        {pieces.map((piece, index) => (
          <li key={piece.slug}>
            <Link href={`/pieces/${piece.slug}`} className={styles.item}>
              <span className={styles.mono}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.name}>{piece.title}</span>
              <span className={styles.line}>{piece.line}</span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
