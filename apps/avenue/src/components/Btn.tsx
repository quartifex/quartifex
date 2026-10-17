// The site's button: an uppercase label block and a square arrow tile, joined by a 2px seam.
import type { ReactNode } from "react";

export function Arrow() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  );
}

export function Btn({
  href,
  children,
  variant = "primary",
  onClick,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "quiet";
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a className="btn" data-variant={variant} href={href} onClick={onClick}>
      <span className="btn-label">{children}</span>
      <span className="btn-arrow">
        <Arrow />
      </span>
    </a>
  );
}

/** Four lane markers on a frame's corners. */
export function Marks() {
  return (
    <>
      <i className="mark" data-at="tl" />
      <i className="mark" data-at="tr" />
      <i className="mark" data-at="bl" />
      <i className="mark" data-at="br" />
    </>
  );
}
