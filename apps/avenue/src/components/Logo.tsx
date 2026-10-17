// The AVENUE mark (two lanes converging into an A; the stop line is its bar) and the lockup.
// Drawn inline in currentColor. Path data from scripts/brand.py; the same files sit in
// public/brand/ for anyone who needs them.
import { MARK, MARK_SMALL, WORD } from "./logo-paths";

export function Mark({
  size = 24,
  small = false,
  title,
}: {
  size?: number;
  small?: boolean;
  title?: string;
}) {
  const paths = small ? MARK_SMALL : MARK;
  return (
    <svg
      viewBox="10 6 100 106"
      width={(size * 100) / 106}
      height={size}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="currentColor"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Mark plus wordmark, baseline-aligned, the mark 1.5 cap heights tall. */
export function Lockup({ height = 22, title = "AVENUE" }: { height?: number; title?: string }) {
  const cap = WORD.height;
  const markH = cap * 1.5;
  const scale = markH / 106;
  const markW = 100 * scale;
  const gap = cap * 0.95;
  const total = markW + gap + WORD.width;
  return (
    <svg
      viewBox={`0 ${cap - markH} ${total} ${markH}`}
      height={height}
      width={(height * total) / markH}
      role="img"
      aria-label={title}
      fill="currentColor"
    >
      <title>{title}</title>
      <g transform={`translate(${-10 * scale} ${cap - markH - 6 * scale}) scale(${scale})`}>
        {MARK.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path transform={`translate(${markW + gap} 0)`} d={WORD.d} />
    </svg>
  );
}
