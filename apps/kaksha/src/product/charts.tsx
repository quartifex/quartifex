"use client";
// Hand-drawn SVG charts. Each one has the numbers in text beside or under it, so
// nothing depends on seeing the picture.
import type { CSSProperties, ReactNode } from "react";

export interface BarDatum {
  key: string;
  label: ReactNode;
  value: number | null;
  /** Shown on the right; defaults to the value. */
  text: string;
}

export function Bars({
  data,
  low = 50,
  caption,
}: {
  data: BarDatum[];
  low?: number;
  caption?: string;
}) {
  return (
    <figure className="bars" style={{ margin: 0 }}>
      {caption ? <figcaption className="sr-only">{caption}</figcaption> : null}
      {data.map((d) => (
        <div className="bar" key={d.key}>
          <span className="bar__label">{d.label}</span>
          <span className="bar__track" aria-hidden="true">
            <span
              className={`bar__fill${d.value !== null && d.value < low ? " bar__fill--low" : ""}`}
              style={{ display: "block", width: `${Math.max(0, Math.min(100, d.value ?? 0))}%` }}
            />
          </span>
          <span className="bar__value num">{d.text}</span>
        </div>
      ))}
    </figure>
  );
}

export interface TrendDatum {
  key: string;
  label: string;
  value: number | null;
}

/** Percentages over time. Gaps (absent, unfinished) break the line. */
export function Trend({
  data,
  title,
  height = 160,
}: {
  data: TrendDatum[];
  title: string;
  height?: number;
}) {
  const w = 320;
  const h = height;
  const padX = 22;
  const padY = 16;
  const step = data.length > 1 ? (w - padX * 2) / (data.length - 1) : 0;
  const x = (i: number) => (data.length > 1 ? padX + i * step : w / 2);
  const y = (v: number) => padY + (1 - v / 100) * (h - padY * 2);
  const segments: string[] = [];
  let current = "";
  data.forEach((d, i) => {
    if (d.value === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`;
  });
  if (current) segments.push(current);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      role="img"
      aria-label={title}
      style={{ display: "block", maxHeight: h + 20 }}
    >
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line
            x1={padX}
            x2={w - padX}
            y1={y(g)}
            y2={y(g)}
            stroke="var(--rule)"
            strokeDasharray={g === 50 ? "3 4" : undefined}
          />
          <text x={2} y={y(g) + 4} fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)">
            {g}
          </text>
        </g>
      ))}
      {segments.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {data.map((d, i) =>
        d.value === null ? (
          <circle
            key={d.key}
            cx={x(i)}
            cy={y(0)}
            r="4"
            fill="var(--paper)"
            stroke="var(--ink-3)"
            strokeDasharray="2 2"
          />
        ) : (
          <circle
            key={d.key}
            cx={x(i)}
            cy={y(d.value)}
            r="5"
            fill="var(--card)"
            stroke="var(--brand)"
            strokeWidth="2.5"
          />
        ),
      )}
    </svg>
  );
}

/** A compact row of squares: one per question, darker = more of the class got it. */
export function MasteryStrip({
  values,
  labels,
}: {
  values: Array<number | null>;
  labels: string[];
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }} aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={labels[i]}
          title={`${labels[i]}: ${v ?? "–"}%`}
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background:
              v === null
                ? "var(--paper-2)"
                : v < 50
                  ? "var(--genda)"
                  : `color-mix(in srgb, var(--brand) ${Math.round(v)}%, var(--paper-2))`,
          }}
        />
      ))}
    </div>
  );
}

export interface GroupDatum {
  key: string;
  label: string;
  a: number;
  b: number;
  title: string;
}

/** Two bars per group (present and absent, say), with a light grid. Numbers are in `title`. */
export function GroupBars({
  data,
  labels,
  caption,
  height = 190,
}: {
  data: GroupDatum[];
  labels: [string, string];
  caption: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
  const step = max <= 10 ? 2 : max <= 30 ? 10 : max <= 60 ? 20 : 50;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  return (
    <figure className="gbars" style={{ margin: 0 }}>
      <div className="gbars__legend" aria-hidden="true">
        <span className="lg lg--brand">{labels[0]}</span>
        <span className="lg lg--soft">{labels[1]}</span>
      </div>
      <div className="gbars__plot" style={{ height }} role="img" aria-label={caption}>
        <div className="gbars__ticks" aria-hidden="true">
          {[...ticks].reverse().map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
        <div className="gbars__area">
          {ticks.map((v) => (
            <i key={v} className="gbars__grid" style={{ "--f": v / top } as CSSProperties} />
          ))}
          {data.map((d) => (
            <div key={d.key} className="gbars__group" title={d.title}>
              <div className="gbars__pair">
                <span className="gbars__a" style={{ height: `${(d.a / top) * 100}%` }} />
                <span className="gbars__b" style={{ height: `${(d.b / top) * 100}%` }} />
              </div>
              <span className="gbars__label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">
        {caption}: {data.map((d) => d.title).join("; ")}
      </figcaption>
    </figure>
  );
}

export interface DonutPart {
  key: string;
  label: string;
  value: number;
  tone: "brand" | "soft" | "low";
}

/** A ring with a number in the middle; the parts are listed as text beside it. */
export function Donut({
  parts,
  center,
  sub,
  caption,
}: {
  parts: DonutPart[];
  center: string;
  sub: string;
  caption: string;
}) {
  const total = Math.max(
    1,
    parts.reduce((n, p) => n + p.value, 0),
  );
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <figure className="donut" style={{ margin: 0 }}>
      <div className="donut__ring">
        <svg viewBox="0 0 128 128" role="img" aria-label={caption}>
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="16" />
          {parts.map((p) => {
            const len = (p.value / total) * c;
            const el = (
              <circle
                key={p.key}
                cx="64"
                cy="64"
                r={r}
                fill="none"
                className={`donut__seg donut__seg--${p.tone}`}
                strokeWidth="16"
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 64 64)"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <span className="donut__center">
          <strong className="num">{center}</strong>
          <small>{sub}</small>
        </span>
      </div>
      <figcaption className="donut__legend">
        {parts.map((p) => (
          <span key={p.key} className={`lg lg--${p.tone}`}>
            {p.label} <b className="num">{p.value}</b>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** A month at a glance, with days that have a test marked. */
export function MonthCalendar({
  year,
  month,
  marks,
  weekdays,
  title,
  today,
}: {
  year: number;
  month: number;
  marks: Map<number, string>;
  weekdays: string[];
  title: string;
  today: number | null;
}) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const cells: Array<number | null> = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  return (
    <table className="cal">
      <caption className="cal__title">{title}</caption>
      <thead>
        <tr>
          {weekdays.map((w) => (
            <th key={w} scope="col" abbr={w}>
              {w.slice(0, 2)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: Math.ceil(cells.length / 7) }, (_, row) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: weeks of a fixed month
          <tr key={row}>
            {cells.slice(row * 7, row * 7 + 7).map((d, i) => {
              const mark = d ? marks.get(d) : undefined;
              return (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: days of a fixed month
                  key={i}
                  data-today={d !== null && d === today}
                  data-mark={Boolean(mark)}
                  title={mark}
                >
                  {d ?? ""}
                  {mark ? <span className="sr-only">: {mark}</span> : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
