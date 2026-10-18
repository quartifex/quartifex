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
  home: "M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1z",
  users:
    "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20a6 6 0 0112 0M16 4.5a3.5 3.5 0 010 6.5M18 14a5 5 0 013 6",
  bars: "M4 20h16M7 16v-5M12 16V6M17 16v-8",
  menu: "M4 7h16M4 12h16M4 17h16",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4",
  shield: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z",
  check: "M5 12.5l4.5 4.5L19 7",
  note: "M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h5",
  phone: "M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2",
  wifiOff: "M3 3l18 18M8.5 16.5a5 5 0 017 0M5 12.5a10 10 0 015-2.6M14 10a10 10 0 015 2.5M12 20h.01",
  key: "M15 8a4 4 0 11-3.8 5.2L4 20v-3h2v-2h2l2.2-2.2A4 4 0 0115 8z",
  text: "M5 6h14M12 6v13M8 19h8",
  help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.5M12 17h.01",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
  file: "M6 3h9l4 4v14H6zM15 3v4h4",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
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
export function Tikki({
  size = 40,
  mood = "happy",
}: {
  size?: number;
  mood?: "happy" | "calm" | "thinking";
}) {
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
        ) : mood === "thinking" ? (
          <path
            d="M210 318 Q256 296 302 318"
            fill="none"
            stroke="#FBF7EE"
            strokeWidth="24"
            strokeLinecap="round"
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

/** The four places the app has. Shown on the top-level screens only. */
export function TabBar() {
  const { t, go, route } = useApp();
  const head = route[0] ?? "";
  const tabs = [
    { path: "/", match: ["", "today"], icon: "home", label: t("tab.today") },
    { path: "/classes", match: ["classes"], icon: "users", label: t("tab.classes") },
    { path: "/insights", match: ["insights"], icon: "bars", label: t("tab.insights") },
    { path: "/more", match: ["more", "settings"], icon: "menu", label: t("tab.more") },
  ] as const;
  return (
    <nav className="k-tabs" aria-label={t("tab.label")}>
      {tabs.map((x) => {
        const on = (x.match as readonly string[]).includes(head);
        return (
          <a
            key={x.path}
            href={`#${x.path}`}
            aria-current={on ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              go(x.path);
            }}
          >
            <span className="k-tabs__icon">
              <Icon name={x.icon} />
            </span>
            {x.label}
          </a>
        );
      })}
    </nav>
  );
}

/** A large page title for the top-level tabs. */
export function PageHead({
  kicker,
  title,
  actions,
}: {
  kicker?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="k-head">
      <div className="k-head__text">
        {kicker ? <span className="k-kicker">{kicker}</span> : null}
        <h1>{title}</h1>
      </div>
      {actions}
    </header>
  );
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="k-sechead">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function Pill({
  tone = "plain",
  children,
}: {
  tone?: "plain" | "genda" | "right" | "wrong" | "ink";
  children: ReactNode;
}) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

/** A thin progress bar. Orange below the line, which is half unless said otherwise. */
export function Meter({
  value,
  low = 50,
  tone,
}: {
  value: number | null;
  low?: number;
  tone?: "ink" | "genda" | "on-ink";
}) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const cls = tone ?? (value !== null && value < low ? "genda" : "ink");
  return (
    <span className={`meter meter--${cls}`} aria-hidden="true">
      <span style={{ width: `${v}%` }} />
    </span>
  );
}

/** Big tap row used by onboarding and More. */
export function ChoiceRow({
  selected,
  onClick,
  title,
  sub,
  lang,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  sub?: string;
  lang?: string | undefined;
}) {
  return (
    <button type="button" className="choice" aria-pressed={selected} onClick={onClick} lang={lang}>
      <span className="choice__text">
        <strong>{title}</strong>
        {sub ? <span>{sub}</span> : null}
      </span>
      <span className="choice__tick" aria-hidden="true">
        {selected ? <Icon name="check" /> : null}
      </span>
    </button>
  );
}

export function Toggle({
  on,
  onChange,
  label,
  sub,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="toggle-row"
      onClick={() => onChange(!on)}
    >
      <span className="toggle-row__text">
        <strong>{label}</strong>
        {sub ? <span>{sub}</span> : null}
      </span>
      <span className="toggle" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
