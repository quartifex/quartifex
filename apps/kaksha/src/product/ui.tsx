"use client";
import { createElement, type ReactNode, useEffect, useRef } from "react";
import { PRODUCT_NAME } from "../config";
import { LOCALES, type Locale } from "../i18n";
import { ICON_DATA, type IconEl, type IconName } from "../icons";
import { useApp } from "./context";

export type { IconName } from "../icons";

/** Tabler icons (stroke 2, round joins), inlined at build by scripts/icons.mjs. */
export function Icon({ name, label }: { name: IconName; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {(ICON_DATA[name] as readonly IconEl[]).map(([tag, attrs], i) =>
        createElement(tag, { key: `${name}-${i}`, ...attrs }),
      )}
    </svg>
  );
}

/** The K mark: an upright stroke with two leaves. Same drawing as /brand/mark.svg. */
export function Mark({ size = 40, tile = true }: { size?: number; tile?: boolean }) {
  const stroke = tile ? "#F1EBFE" : "var(--brand)";
  const upper = tile ? "#FFFFFF" : "var(--brand-soft)";
  const lower = tile ? "#E3D7FB" : "var(--brand)";
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true" focusable="false">
      {tile ? <rect width="512" height="512" rx="116" fill="#0B44FF" /> : null}
      <g
        transform={tile ? "translate(125.6 106) scale(1.7045)" : "translate(89.3 66) scale(2.1591)"}
      >
        <rect x="0" y="0" width="49" height="176" fill={stroke} />
        <path d="M49 0H160C157 48 118 80 49 69Z" fill={upper} />
        <path d="M49 69C110 69 155 118 160 176H106C101 130 80 90 49 69Z" fill={lower} />
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
          <Mark size={36} />
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
      <Mark size={88} />
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

/**
 * The four places the app has. A bottom bar on phones (top-level screens only); a rail
 * down the left on wider screens, on every screen, with the mark and the theme switch.
 */
export function TabBar() {
  const { t, go, route, theme, setTheme } = useApp();
  const head = route[0] ?? "";
  const tabs = [
    { path: "/", match: ["", "today"], icon: "home", label: t("tab.today") },
    {
      path: "/classes",
      match: ["classes", "class", "test", "student", "new-class"],
      icon: "school",
      label: t("tab.classes"),
    },
    { path: "/insights", match: ["insights"], icon: "report", label: t("tab.insights") },
    { path: "/more", match: ["more", "settings"], icon: "settings", label: t("tab.more") },
  ] as const;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  return (
    <nav className="k-tabs" aria-label={t("tab.label")}>
      <button
        type="button"
        className="k-tabs__brand"
        aria-label={PRODUCT_NAME}
        onClick={() => go("/")}
      >
        <Mark size={44} />
      </button>
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
            <span className="k-tabs__label">{x.label}</span>
          </a>
        );
      })}
      <button
        type="button"
        className="k-tabs__theme"
        onClick={() => setTheme(dark ? "light" : "dark")}
        aria-label={dark ? t("settings.theme.light") : t("settings.theme.dark")}
      >
        <Icon name={dark ? "sun" : "moon"} />
      </button>
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
