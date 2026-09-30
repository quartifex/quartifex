"use client";

// frameguide (LB13, Lab): a debug overlay that draws safe frames, the focal point, the
// subject and the text zones over any staged scene. Lab code: no API promises.
import type { Box, Frame, Point } from "@quartifex/safeframe";

export type Layer = "thirds" | "safe" | "subject" | "focal" | "text" | "crops";

export const LAYERS: ReadonlyArray<{ value: Layer; label: string }> = [
  { value: "subject", label: "Subject" },
  { value: "focal", label: "Focal point" },
  { value: "text", label: "Text zone" },
  { value: "safe", label: "Action / title safe" },
  { value: "thirds", label: "Thirds" },
  { value: "crops", label: "Social crops" },
];

/** What the overlay needs: a safeframe Frame, or the same fields read from data attributes. */
export type Guide = {
  width: number;
  height: number;
  subject?: Box;
  focal?: Point;
  text?: Box | null;
  bucket?: string;
};

export function guideFromFrame(frame: Frame): Guide {
  return {
    width: frame.viewport.width,
    height: frame.viewport.height,
    subject: frame.subject,
    focal: frame.focal,
    text: frame.text,
    bucket: frame.bucket,
  };
}

/** Read a guide from any element staged by safeframe (its data attributes and CSS variables). */
export function guideFromElement(el: HTMLElement): Guide {
  const [x = 0, y = 0, w = 0, h = 0] = (el.dataset.sfSubject ?? "").split(" ").map(Number);
  const css = getComputedStyle(el);
  const px = (name: string) => Number.parseFloat(css.getPropertyValue(name)) || 0;
  const textWidth = px("--sf-text-width");
  return {
    width: el.clientWidth,
    height: el.clientHeight,
    ...(el.dataset.sfSubject ? { subject: { x, y, width: w, height: h } } : {}),
    focal: { x: px("--sf-focal-x"), y: px("--sf-focal-y") },
    text: textWidth
      ? {
          x: px("--sf-text-x"),
          y: px("--sf-text-y"),
          width: textWidth,
          height: px("--sf-text-height"),
        }
      : null,
    ...(el.dataset.sfBucket ? { bucket: el.dataset.sfBucket } : {}),
  };
}

const CROPS: ReadonlyArray<[string, number]> = [
  ["9:16", 9 / 16],
  ["4:5", 4 / 5],
  ["1:1", 1],
];

/** An inset rectangle, `share` of each side. */
function inset(width: number, height: number, share: number) {
  const dx = (width * (1 - share)) / 2;
  const dy = (height * (1 - share)) / 2;
  return { x: dx, y: dy, width: width - dx * 2, height: height - dy * 2 };
}

export function Overlay({ guide, layers }: { guide: Guide; layers: ReadonlySet<Layer> }) {
  const { width: w, height: h } = guide;
  const line = Math.max(1, Math.min(w, h) / 400);
  const label = Math.max(11, Math.min(w, h) / 40);
  const action = inset(w, h, 0.93);
  const title = inset(w, h, 0.9);
  const focal = guide.focal ?? { x: w / 2, y: h / 2 };
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
      aria-hidden="true"
      data-testid="frameguide"
      data-layers={[...layers].sort().join(" ")}
      fontFamily="ui-monospace, monospace"
      fontSize={label}
    >
      {layers.has("thirds") && (
        <g stroke="rgb(237 234 228 / 0.35)" strokeWidth={line}>
          {[1, 2].map((i) => (
            <g key={i}>
              <line x1={(w * i) / 3} y1={0} x2={(w * i) / 3} y2={h} />
              <line x1={0} y1={(h * i) / 3} x2={w} y2={(h * i) / 3} />
            </g>
          ))}
        </g>
      )}
      {layers.has("safe") && (
        <g fill="none" stroke="rgb(237 234 228 / 0.55)" strokeWidth={line}>
          <rect {...action} strokeDasharray={`${line * 6} ${line * 4}`} />
          <rect {...title} />
          <text
            x={title.x + line * 4}
            y={title.y + label * 1.3}
            fill="rgb(237 234 228 / 0.7)"
            stroke="none"
          >
            title safe 90%
          </text>
        </g>
      )}
      {layers.has("crops") &&
        CROPS.map(([name, aspect]) => {
          const cropW = Math.min(w, h * aspect);
          const cropH = cropW / aspect;
          const x = Math.min(Math.max(focal.x - cropW / 2, 0), w - cropW);
          const y = Math.min(Math.max(focal.y - cropH / 2, 0), h - cropH);
          return (
            <g key={name} fill="none" stroke="rgb(237 234 228 / 0.45)" strokeWidth={line}>
              <rect
                x={x}
                y={y}
                width={cropW}
                height={cropH}
                strokeDasharray={`${line * 2} ${line * 4}`}
              />
              <text
                x={x + line * 4}
                y={y + cropH - line * 6}
                fill="rgb(237 234 228 / 0.7)"
                stroke="none"
              >
                {name}
              </text>
            </g>
          );
        })}
      {layers.has("text") && guide.text && (
        <g>
          <rect
            {...guide.text}
            fill="rgb(237 234 228 / 0.06)"
            stroke="rgb(237 234 228 / 0.8)"
            strokeWidth={line}
          />
          <text
            x={guide.text.x + line * 4}
            y={guide.text.y - line * 4}
            fill="rgb(237 234 228 / 0.8)"
          >
            text zone
          </text>
        </g>
      )}
      {layers.has("subject") && guide.subject && (
        <g>
          <rect
            {...guide.subject}
            fill="none"
            stroke="#3fbead"
            strokeWidth={line * 1.5}
            strokeDasharray={`${line * 8} ${line * 5}`}
          />
          <text x={guide.subject.x + line * 4} y={guide.subject.y - line * 4} fill="#3fbead">
            subject{guide.bucket ? ` · ${guide.bucket}` : ""}
          </text>
        </g>
      )}
      {layers.has("focal") && (
        <g stroke="#3fbead" strokeWidth={line * 1.5} fill="none">
          <circle cx={focal.x} cy={focal.y} r={label} />
          <line x1={focal.x - label * 2} y1={focal.y} x2={focal.x + label * 2} y2={focal.y} />
          <line x1={focal.x} y1={focal.y - label * 2} x2={focal.x} y2={focal.y + label * 2} />
        </g>
      )}
    </svg>
  );
}
