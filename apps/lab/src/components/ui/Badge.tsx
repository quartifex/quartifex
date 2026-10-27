import type { ReactNode } from "react";

type Tone = "default" | "accent" | "soft" | "outline" | "ink" | "lab";

/** Status and label chips. Project labels (Client project, Personal case study) use these. */
export function Badge({
  tone = "default",
  live = false,
  children,
}: {
  tone?: Tone;
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={tone === "default" ? "badge" : `badge ${tone}`}>
      {live ? <span className="dot live" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
