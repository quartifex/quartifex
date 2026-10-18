"use client";
import { type ReactNode, useEffect, useRef } from "react";
import { PRODUCT_NAME } from "../config";
import { LOCALES, type Locale } from "../i18n";
import { useApp } from "./context";

/** One stroke weight, currentColor, outline by default. */
const paths = {
  back: "M15 5l-7 7 7 7",
  chev: "M9 5l7 7-7 7",
  plus: "M12 5v14M5 12h14",
  undo: "M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  chart: "M5 20V10M12 20V4M19 20v-7",
  print:
    "M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-5a2 2 0 012-2h12a2 2 0 012 2v5a1 1 0 01-1 1h-2M7 14h10v6H7z",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z",
  download: "M12 4v12M6 11l6 6 6-6M5 20h14",
  upload: "M12 20V8M6 13l6-6 6 6M5 4h14",
  share: "M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M12 3v13M7 8l5-5 5 5",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  pencil: "M4 20h4L19 9l-4-4L4 16v4z",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 018 0v4",
  close: "M6 6l12 12M18 6L6 18",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  next: "M5 12h14M13 6l6 6-6 6",
  prev: "M19 12H5M11 6l-6 6 6 6",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, label }: { name: IconName; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <path d={paths[name]} />
    </svg>
  );
}

/** Tikki, the slate whose smile is a tick. Same drawing as /brand/mark.svg. */
export function Tikki({ size = 40, mood = "happy" }: { size?: number; mood?: "happy" | "calm" }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tikki-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC94A" />
          <stop offset="1" stopColor="#EE8A0B" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#tikki-g)" />
      <g transform="rotate(-6 256 262)">
        <rect x="92" y="118" width="328" height="284" rx="64" fill="#1B2340" />
        <rect x="124" y="150" width="264" height="220" rx="38" fill="#2C3A63" />
        <circle cx="204" cy="232" r="23" fill="#FBF7EE" />
        <circle cx="306" cy="232" r="23" fill="#FBF7EE" />
        {mood === "happy" ? (
          <path
            d="M196 296 L240 334 L320 266"
            fill="none"
            stroke="#FBF7EE"
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M206 312 L306 312"
            fill="none"
            stroke="#FBF7EE"
            strokeWidth="26"
            strokeLinecap="round"
          />
        )}
      </g>
    </svg>
  );
}

export function LanguageSwitch() {
  const { locale, setLocale, t } = useApp();
  return (
    <fieldset className="seg" aria-label={t("settings.language")}>
      {(Object.keys(LOCALES) as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          lang={LOCALES[l].intl.split("-")[0]}
          aria-pressed={l === locale}
          onClick={() => setLocale(l)}
          aria-label={LOCALES[l].label}
        >
          {LOCALES[l].short}
        </button>
      ))}
    </fieldset>
  );
}

export function TopBar({
  title,
  sub,
  back,
  actions,
}: {
  title?: string | undefined;
  sub?: string | undefined;
  back?: string | undefined;
  actions?: ReactNode;
}) {
  const { go, t } = useApp();
  return (
    <header className="k-bar">
      {back !== undefined ? (
        <button
          type="button"
          className="icon-btn"
          onClick={() => go(back)}
          aria-label={t("nav.back")}
        >
          <Icon name="back" />
        </button>
      ) : (
        <span style={{ display: "inline-flex", paddingRight: 4 }}>
          <Tikki size={36} />
        </span>
      )}
      <div className="k-bar__title">
        <strong>{title ?? PRODUCT_NAME}</strong>
        {sub ? <span>{sub}</span> : null}
      </div>
      {actions}
    </header>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useApp();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} aria-labelledby="sheet-title">
      <div className="sheet__body">
        <div className="spread">
          <h2 id="sheet-title">{title}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <Icon name="close" />
          </button>
        </div>
        {open ? children : null}
      </div>
    </dialog>
  );
}

export function Empty({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Tikki size={96} mood="calm" />
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {children}
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
