"use client";

import { type ReactNode, useId, useMemo, useState } from "react";
import styles from "./Hub.module.css";

export type HubEntry = {
  id: string;
  built: boolean;
  /** Lower-cased text the search box matches against. */
  haystack: string;
  card: ReactNode;
};

export type HubGroup = { kind: string; label: string; entries: HubEntry[] };

type Status = "all" | "built" | "soon";

const STATUSES: { value: Status; label: string }[] = [
  { value: "all", label: "All" },
  { value: "built", label: "Built" },
  { value: "soon", label: "Soon" },
];

/** Catalog browser: filter by kind, status and text. Cards arrive server-rendered. */
export function Hub({ groups }: { groups: HubGroup[] }) {
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [query, setQuery] = useState("");
  const searchId = useId();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groups
      .filter((group) => kind === "all" || group.kind === kind)
      .map((group) => ({
        ...group,
        entries: group.entries.filter(
          (entry) =>
            (status === "all" || (status === "built") === entry.built) &&
            (needle === "" || entry.haystack.includes(needle)),
        ),
      }))
      .filter((group) => group.entries.length > 0);
  }, [groups, kind, status, query]);

  const total = visible.reduce((sum, group) => sum + group.entries.length, 0);

  return (
    <>
      <search className={styles.filters}>
        <fieldset className={styles.set}>
          <legend className="visually-hidden">Kind</legend>
          {[{ kind: "all", label: "All" }, ...groups].map((option) => (
            <button
              key={option.kind}
              type="button"
              className={styles.option}
              aria-pressed={kind === option.kind}
              onClick={() => setKind(option.kind)}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
        <fieldset className={styles.set}>
          <legend className="visually-hidden">Status</legend>
          {STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.option}
              aria-pressed={status === option.value}
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
        <div className={styles.search}>
          <label htmlFor={searchId} className="visually-hidden">
            Search the catalog
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            autoComplete="off"
          />
        </div>
      </search>

      <p className={styles.count} aria-live="polite" data-testid="result-count">
        {total} {total === 1 ? "item" : "items"}
      </p>

      {visible.map((group) => (
        <section key={group.kind} className={styles.group} aria-labelledby={`group-${group.kind}`}>
          <h2 id={`group-${group.kind}`} className={styles.heading}>
            {group.label} <span>{group.entries.length}</span>
          </h2>
          <ul className={styles.grid}>
            {group.entries.map((entry) => (
              <li key={entry.id}>{entry.card}</li>
            ))}
          </ul>
        </section>
      ))}

      {total === 0 && <p className={styles.empty}>Nothing matches those filters.</p>}
    </>
  );
}
