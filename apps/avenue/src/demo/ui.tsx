"use client";
// The interface's controls. Each one presses like a physical control (a quick, decisive scale
// to 0.96 with the tokens' press easing), says what it is to a screen reader, and works from
// the keyboard. Sound, when the visitor has turned it on, comes from here.
import { type KeyboardEvent, type ReactNode, useId, useRef } from "react";
import s from "./demo.module.css";
import { Icon, type IconName } from "./Icon";
import { type Cue, play } from "./sound";
import { demo } from "./store";

const cue = (c: Cue) => play(c, demo.get().system.sound);

export function Press({
  children,
  onPress,
  label,
  className,
  pressed,
  disabled,
  locked,
  variant,
  sound = "press",
  ...rest
}: {
  children: ReactNode;
  onPress: () => void;
  label?: string;
  className?: string | undefined;
  pressed?: boolean;
  disabled?: boolean;
  /** Locked by the driving rules: still focusable, says why, does nothing. */
  locked?: string;
  variant?: "accent" | "danger" | "quiet";
  sound?: Cue;
} & {
  "aria-current"?: "page" | "true";
  "aria-haspopup"?: "dialog";
  "aria-controls"?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      className={`${s.press} ${className ?? ""}`}
      data-variant={variant}
      aria-label={label && locked ? `${label}, ${locked}` : label}
      aria-pressed={pressed}
      aria-disabled={locked ? true : undefined}
      disabled={disabled}
      data-locked={locked ? "" : undefined}
      onClick={() => {
        cue(sound);
        onPress();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  pressed,
  locked,
  variant,
  filled,
  sound,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  pressed?: boolean;
  locked?: string;
  variant?: "accent" | "danger" | "quiet";
  filled?: boolean;
  sound?: Cue;
}) {
  return (
    <Press
      className={s.iconButton}
      label={label}
      onPress={onPress}
      {...(pressed === undefined ? {} : { pressed })}
      {...(locked ? { locked } : {})}
      {...(variant ? { variant } : {})}
      {...(sound ? { sound } : {})}
    >
      <Icon name={locked ? "lock" : icon} filled={Boolean(filled)} />
    </Press>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  detail,
  locked,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  detail?: string;
  locked?: string;
}) {
  const id = useId();
  return (
    <div className={s.switchRow}>
      <span className={s.switchText}>
        <span id={`${id}-l`} className={s.switchLabel}>
          {label}
        </span>
        {detail ? (
          <span id={`${id}-d`} className={s.switchDetail}>
            {locked ?? detail}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={detail ? `${id}-d` : undefined}
        aria-disabled={locked ? true : undefined}
        className={s.switch}
        data-locked={locked ? "" : undefined}
        onClick={() => {
          if (locked) return;
          cue(checked ? "press" : "confirm");
          onChange(!checked);
        }}
      >
        <span className={s.switchThumb} />
      </button>
    </div>
  );
}

export function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={s.range}>
      <label htmlFor={id} className={s.rangeLabel}>
        <span>{label}</span>
        <output htmlFor={id} className={s.rangeValue}>
          {format(value)}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        style={{ "--fill": `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
    </div>
  );
}

/** A row of options with one chosen: a radiogroup with arrow-key movement. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  hideLabel,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string; icon?: IconName }>;
  value: T;
  onChange: (v: T) => void;
  hideLabel?: boolean;
}) {
  const id = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const onKey = (e: KeyboardEvent) => {
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    cue("press");
    onChange(option.value);
    refs.current[next]?.focus();
  };
  return (
    <div className={s.segmentedWrap}>
      <span id={id} className={hideLabel ? "sr-only" : s.segmentedLabel}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className={s.segmented} onKeyDown={onKey}>
        {options.map((o, i) => (
          // biome-ignore lint/a11y/useSemanticElements: a segmented control: buttons in a radiogroup with roving focus and arrow keys
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            tabIndex={o.value === value ? 0 : -1}
            className={s.segment}
            onClick={() => {
              cue("press");
              onChange(o.value);
            }}
          >
            {o.icon ? <Icon name={o.icon} size="1.2em" /> : null}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Card({
  title,
  children,
  className,
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string | undefined;
  action?: ReactNode;
}) {
  return (
    <section className={`${s.card} ${className ?? ""}`} aria-label={title}>
      {title || action ? (
        <header className={s.cardHead}>
          {title ? <h4 className={s.cardTitle}>{title}</h4> : <span />}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Generated cover art: tonal, no imagery, from a hue and a seed. */
export function Art({
  hue,
  seed,
  className,
}: {
  hue: number;
  seed: number;
  className?: string | undefined;
}) {
  const r = (n: number) => ((Math.sin(seed * 97.13 + n * 13.7) + 1) / 2) * 100;
  return (
    <span
      className={`${s.art} ${className ?? ""}`}
      aria-hidden="true"
      style={
        {
          "--h": hue,
          "--x1": `${r(1)}%`,
          "--y1": `${r(2)}%`,
          "--x2": `${r(3)}%`,
          "--y2": `${r(4)}%`,
        } as React.CSSProperties
      }
    />
  );
}
