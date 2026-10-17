"use client";
// The 25 Volere requirement cards, filterable by MoSCoW priority and type. Each card opens to
// its rationale, fit criterion, design principle, source and use cases, as filed.
import { useMemo, useState } from "react";
import { PRIORITY_LABEL, type Priority, REQUIREMENTS, type ReqType } from "@/content/volere";
import s from "./Process.module.css";

const PRIORITIES: Array<Priority | "all"> = ["all", "Must", "Should", "Could", "High"];
const TYPES: Array<ReqType | "all"> = ["all", "Functional", "Non-functional"];

function Filter<T extends string>({
  label,
  options,
  value,
  onChange,
  name,
  count,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  name: (v: T) => string;
  count: (v: T) => number;
}) {
  return (
    <fieldset className={s.filter}>
      <legend className={s.filterLegend}>{label}</legend>
      <div className={s.filterOptions}>
        {options.map((o) => (
          <label key={o} className={s.filterOption}>
            <input
              type="radio"
              name={label}
              value={o}
              checked={value === o}
              onChange={() => onChange(o)}
            />
            <span>
              {name(o)} <span className={s.filterCount}>{count(o)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function VolereExplorer() {
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [type, setType] = useState<ReqType | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const shown = useMemo(
    () =>
      REQUIREMENTS.filter(
        (r) =>
          (priority === "all" || r.priority === priority) && (type === "all" || r.type === type),
      ),
    [priority, type],
  );
  return (
    <div className={s.explorer}>
      <div className={s.filters}>
        <Filter
          label="Priority"
          options={PRIORITIES}
          value={priority}
          onChange={setPriority}
          name={(v) => (v === "all" ? "All" : PRIORITY_LABEL[v])}
          count={(v) =>
            REQUIREMENTS.filter(
              (r) => (v === "all" || r.priority === v) && (type === "all" || r.type === type),
            ).length
          }
        />
        <Filter
          label="Type"
          options={TYPES}
          value={type}
          onChange={setType}
          name={(v) => (v === "all" ? "All" : v)}
          count={(v) =>
            REQUIREMENTS.filter(
              (r) =>
                (v === "all" || r.type === v) && (priority === "all" || r.priority === priority),
            ).length
          }
        />
      </div>
      <p className={s.resultCount} aria-live="polite">
        Showing {shown.length} of {REQUIREMENTS.length}
      </p>
      <ul className={s.cards}>
        {shown.map((r) => {
          const expanded = open === r.id;
          return (
            <li
              key={r.id}
              className={s.req}
              data-priority={r.priority}
              data-open={expanded ? "" : undefined}
            >
              <h4 className={s.reqHead}>
                <button
                  type="button"
                  className={s.reqButton}
                  aria-expanded={expanded}
                  aria-controls={`req-${r.id}`}
                  onClick={() => setOpen(expanded ? null : r.id)}
                >
                  <span className={s.reqId} aria-hidden="true">
                    {r.id}
                  </span>
                  <span className={s.reqTitle}>
                    <span className="sr-only">Card {r.id}: </span>
                    {r.title}
                  </span>
                  <span className={s.reqMeta}>
                    {PRIORITY_LABEL[r.priority]} · {r.type}
                  </span>
                </button>
              </h4>
              <p className={s.reqDesc}>{r.description}</p>
              <dl id={`req-${r.id}`} className={s.reqDetail} hidden={!expanded}>
                <div>
                  <dt>Rationale</dt>
                  <dd>{r.rationale}</dd>
                </div>
                <div>
                  <dt>Fit criterion</dt>
                  <dd>{r.fit}</dd>
                </div>
                <div>
                  <dt>Design principle</dt>
                  <dd>{r.principles}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{r.source}</dd>
                </div>
                {r.useCases ? (
                  <div>
                    <dt>Use cases</dt>
                    <dd className="mono">{r.useCases}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Supporting material</dt>
                  <dd>{r.support}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
