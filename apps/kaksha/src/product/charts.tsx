"use client";
// Hand-drawn SVG charts. Each one has the numbers in text beside or under it, so
// nothing depends on seeing the picture.
import type { ReactNode } from "react";

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
          stroke="var(--ink)"
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
            fill="var(--genda)"
            stroke="var(--ink)"
            strokeWidth="1.5"
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
                  : `color-mix(in srgb, var(--ink) ${Math.round(v)}%, var(--paper-2))`,
          }}
        />
      ))}
    </div>
  );
}
