"use client";

// Controls shared by every demo: labelled radio groups, toggles, sliders and readouts.
// Native inputs throughout, so keyboard and screen-reader behaviour come for free.
import { type ReactNode, useEffect, useId, useState } from "react";
import styles from "./kit.module.css";

export function Controls({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={styles.controls} aria-label={label}>
      {children}
    </section>
  );
}

export type Choice<T extends string> = { value: T; label: string; hint?: string };

export function Segmented<T extends string>({
  legend,
  value,
  choices,
  onChange,
  name,
}: {
  legend: string;
  value: T;
  choices: readonly Choice<T>[];
  onChange: (value: T) => void;
  name?: string;
}) {
  const id = useId();
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.segments}>
        {choices.map((choice) => (
          <label key={choice.value} className={styles.segment} title={choice.hint}>
            <input
              type="radio"
              name={name ?? id}
              value={choice.value}
              checked={choice.value === value}
              onChange={() => onChange(choice.value)}
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={styles.toggle} data-disabled={disabled || undefined}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function Slider({
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
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const id = useId();
  return (
    <div className={styles.slider}>
      <label htmlFor={id} className={styles.legend}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={format ? format(value) : undefined}
      />
      <output htmlFor={id} className={styles.value}>
        {format ? format(value) : value}
      </output>
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  pressed,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
    >
      {children}
    </button>
  );
}

/** A definition list of live values. `testid` keys make values addressable in tests. */
export function Readout({
  rows,
  label,
}: {
  rows: Array<[string, ReactNode, string?]>;
  label: string;
}) {
  return (
    <dl className={styles.readout} aria-label={label}>
      {rows.map(([name, value, testid]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd data-testid={testid}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

export function Code({ children }: { children: string }) {
  return (
    <pre className={styles.code}>
      <code>{children}</code>
    </pre>
  );
}

/**
 * The visitor's reduced-motion preference, with a demo override so the reduced state can
 * be previewed without changing OS settings.
 */
export function useReducedMotion(): [boolean, (value: boolean) => void] {
  const [system, setSystem] = useState(false);
  const [override, setOverride] = useState<boolean | null>(null);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    setSystem(query.matches);
    const onChange = () => setSystem(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return [override ?? system, setOverride];
}

export function ReducedMotionToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return <Toggle label="Reduced motion" checked={value} onChange={onChange} />;
}
