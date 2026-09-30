"use client";

// A simulated screen of any aspect and pixel ratio, scaled down to fit the demo. The
// content inside is laid out at the device's real CSS size, so what you see is what
// that screen would get.
import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./DeviceStage.module.css";
import { type Choice, Segmented } from "./kit";

export type Device = { width: number; height: number; dpr: number };

export const PRESETS = [
  { value: "tall-phone", label: "9:19.5", hint: "Tall phone, 390 x 844", width: 390, height: 844 },
  { value: "phone", label: "9:16", hint: "Phone, 360 x 640", width: 360, height: 640 },
  {
    value: "phone-landscape",
    label: "19.5:9",
    hint: "Phone landscape, 844 x 390",
    width: 844,
    height: 390,
  },
  { value: "tablet", label: "3:4", hint: "Tablet, 768 x 1024", width: 768, height: 1024 },
  { value: "square", label: "1:1", hint: "Square, 900 x 900", width: 900, height: 900 },
  { value: "laptop", label: "16:10", hint: "Laptop, 1280 x 800", width: 1280, height: 800 },
  { value: "desktop", label: "16:9", hint: "Desktop, 1920 x 1080", width: 1920, height: 1080 },
  { value: "ultrawide", label: "21:9", hint: "Ultrawide, 2520 x 1080", width: 2520, height: 1080 },
  {
    value: "super",
    label: "32:9",
    hint: "Super ultrawide, 3840 x 1080",
    width: 3840,
    height: 1080,
  },
] as const;

export type PresetId = (typeof PRESETS)[number]["value"];

const DPRS: readonly Choice<"1" | "1.5" | "2" | "3">[] = [
  { value: "1", label: "1x" },
  { value: "1.5", label: "1.5x" },
  { value: "2", label: "2x" },
  { value: "3", label: "3x" },
];

export function presetSize(id: PresetId): { width: number; height: number } {
  const preset = PRESETS.find((p) => p.value === id) ?? PRESETS[0];
  return { width: preset.width, height: preset.height };
}

/** Aspect and DPR controls. Returns the device; render it with <Screen>. */
export function useDevice(initial: PresetId = "tall-phone", initialDpr = 3) {
  const [preset, setPreset] = useState<PresetId>(initial);
  const [dpr, setDpr] = useState(String(initialDpr) as "1" | "1.5" | "2" | "3");
  const device: Device = { ...presetSize(preset), dpr: Number(dpr) };
  const controls = (
    <>
      <Segmented legend="Aspect" value={preset} choices={PRESETS} onChange={setPreset} />
      <Segmented legend="Pixel ratio" value={dpr} choices={DPRS} onChange={setDpr} />
    </>
  );
  return { device, preset, setPreset, controls };
}

/** Lays children out at the device's CSS size and scales the result to fit. */
export function Screen({
  device,
  children,
  maxHeight = 560,
  label,
}: {
  device: { width: number; height: number };
  children: ReactNode;
  maxHeight?: number;
  label?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(720);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailable(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(available / device.width, maxHeight / device.height, 1);
  return (
    <div ref={frame} className={styles.frame}>
      <div
        className={styles.screen}
        style={{ width: device.width * scale, height: device.height * scale }}
        role="img"
        aria-label={label ?? `Simulated screen, ${device.width} by ${device.height} CSS pixels`}
      >
        <div
          className={styles.inner}
          style={{ width: device.width, height: device.height, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
      <p className={styles.caption}>
        {device.width} x {device.height} CSS px · shown at {Math.round(scale * 100)}%
      </p>
    </div>
  );
}
