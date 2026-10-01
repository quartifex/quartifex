// safeframe and resolve, drawn over a screen: the subject box, focal point and text zone,
// and the resolution decision with its reasons.
import type { Decision } from "@quartifex/resolve";
import type { Frame } from "@quartifex/safeframe";

export function Overlay({ staged, decision }: { staged: Frame; decision: Decision }) {
  const { width, height } = staged.viewport;
  const line = Math.max(1.5, Math.min(width, height) / 300);
  const font = Math.max(14, Math.min(width, height) / 32);
  const { subject, focal, text } = staged;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden="true"
      data-testid="overlay"
      fontFamily="ui-monospace, monospace"
      fontSize={font}
    >
      <rect
        {...subject}
        fill="none"
        stroke="#3fbead"
        strokeWidth={line}
        strokeDasharray={`${line * 6} ${line * 4}`}
      />
      <text x={subject.x} y={subject.y - line * 4} fill="#3fbead">
        subject · {staged.bucket}
      </text>
      <g stroke="#3fbead" strokeWidth={line}>
        <circle cx={focal.x} cy={focal.y} r={font * 0.8} fill="none" />
        <line x1={focal.x - font * 1.6} y1={focal.y} x2={focal.x + font * 1.6} y2={focal.y} />
        <line x1={focal.x} y1={focal.y - font * 1.6} x2={focal.x} y2={focal.y + font * 1.6} />
      </g>
      {text && (
        <>
          <rect
            {...text}
            fill="rgb(237 234 228 / 0.06)"
            stroke="rgb(237 234 228 / 0.8)"
            strokeWidth={line}
          />
          <text x={text.x + line * 4} y={text.y + font * 1.2} fill="rgb(237 234 228 / 0.85)">
            copy goes here
          </text>
        </>
      )}
      <g fill="#edeae4">
        <rect
          x={0}
          y={height - font * 2.2}
          width={width}
          height={font * 2.2}
          fill="rgb(5 5 5 / 0.85)"
        />
        <text x={font * 0.6} y={height - font * 0.7}>
          {decision.tier.name} · {decision.dpr}x · {decision.needed} px needed · texture{" "}
          {decision.texture}
        </text>
      </g>
    </svg>
  );
}
