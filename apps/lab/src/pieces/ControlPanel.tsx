"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import styles from "./panel.module.css";
import type { Control, ControlValue } from "./types";

type Props = {
  title: string;
  controls: Control[];
  onChange(key: string, value: ControlValue): void;
};

type Point = { x: number; y: number };

function startValues(controls: Control[]) {
  const values: Record<string, ControlValue> = {};
  for (const control of controls) {
    if (control.type !== "action") values[control.key] = control.value;
  }
  return values;
}

function shown(value: number, step: number) {
  const places = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
  return value.toFixed(places);
}

/** A small window of controls that can be dragged anywhere on the piece and folded away. */
export function ControlPanel({ title, controls, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const [at, setAt] = useState<Point | null>(null);
  const [values, setValues] = useState(() => startValues(controls));
  const panelRef = useRef<HTMLElement>(null);
  const grab = useRef<Point | null>(null);
  const bodyId = useId();

  // Start folded on a phone, where the window would cover the piece.
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) setOpen(false);
  }, []);

  function place(x: number, y: number) {
    const panel = panelRef.current;
    if (!panel) return;
    const maxX = window.innerWidth - panel.offsetWidth - 8;
    const maxY = window.innerHeight - 44;
    setAt({ x: Math.max(8, Math.min(maxX, x)), y: Math.max(8, Math.min(maxY, y)) });
  }

  function onGrab(event: ReactPointerEvent<HTMLButtonElement>) {
    const panel = panelRef.current;
    if (!panel) return;
    const box = panel.getBoundingClientRect();
    grab.current = { x: event.clientX - box.left, y: event.clientY - box.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!grab.current) return;
    place(event.clientX - grab.current.x, event.clientY - grab.current.y);
  }

  function onRelease() {
    grab.current = null;
  }

  // The window can be moved from the keyboard too: focus the grip and use the arrow keys.
  function onNudge(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const step = {
      ArrowLeft: [-16, 0],
      ArrowRight: [16, 0],
      ArrowUp: [0, -16],
      ArrowDown: [0, 16],
    }[event.key];
    const panel = panelRef.current;
    if (!step || !panel) return;
    event.preventDefault();
    const box = panel.getBoundingClientRect();
    place(box.left + (step[0] ?? 0), box.top + (step[1] ?? 0));
  }

  function change(key: string, value: ControlValue) {
    setValues((current) => ({ ...current, [key]: value }));
    onChange(key, value);
  }

  function reset() {
    const start = startValues(controls);
    setValues(start);
    for (const [key, value] of Object.entries(start)) onChange(key, value);
  }

  const hasSettings = controls.some((control) => control.type !== "action");

  return (
    <aside
      ref={panelRef}
      className={styles.panel}
      style={at ? { left: at.x, top: at.y, right: "auto" } : undefined}
      aria-label={`${title} controls`}
    >
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.grip}
          aria-label="Move the controls. Drag, or use the arrow keys."
          onPointerDown={onGrab}
          onPointerMove={onDrag}
          onPointerUp={onRelease}
          onPointerCancel={onRelease}
          onKeyDown={onNudge}
        >
          <span aria-hidden="true" className={styles.dots} />
          Controls
        </button>
        <button
          type="button"
          className={styles.fold}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      <div id={bodyId} className={styles.body} hidden={!open}>
        {controls.map((control) => {
          if (control.type === "action") {
            return (
              <button
                key={control.key}
                type="button"
                className={styles.action}
                onClick={() => onChange(control.key, true)}
              >
                {control.label}
              </button>
            );
          }
          const value = values[control.key];
          if (control.type === "range") {
            const number = typeof value === "number" ? value : control.value;
            return (
              <label key={control.key} className={styles.row}>
                <span className={styles.name}>
                  {control.label}
                  <output>{shown(number, control.step)}</output>
                </span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={number}
                  onChange={(event) => change(control.key, Number(event.target.value))}
                />
              </label>
            );
          }
          if (control.type === "toggle") {
            return (
              <label key={control.key} className={styles.check}>
                <input
                  type="checkbox"
                  checked={typeof value === "boolean" ? value : control.value}
                  onChange={(event) => change(control.key, event.target.checked)}
                />
                {control.label}
              </label>
            );
          }
          return (
            <label key={control.key} className={styles.row}>
              <span className={styles.name}>{control.label}</span>
              <select
                value={typeof value === "string" ? value : control.value}
                onChange={(event) => change(control.key, event.target.value)}
              >
                {control.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          );
        })}
        {hasSettings && (
          <button type="button" className={styles.reset} onClick={reset}>
            Reset
          </button>
        )}
      </div>
    </aside>
  );
}
