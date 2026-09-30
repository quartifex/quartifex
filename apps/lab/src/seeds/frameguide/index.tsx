"use client";

// frameguide (LB13, Lab). Safe frames, focal point, subject and text zones over a scene,
// with a controls menu and a keyboard shortcut (G) to show or hide every guide.
import type { Frame } from "@quartifex/safeframe";
import { useCallback, useEffect, useState } from "react";
import { Screen, useDevice } from "@/components/demo/DeviceStage";
import { Controls, Note, Readout, Segmented, Toggle } from "@/components/demo/kit";
import { SceneView } from "@/scene/SceneView";
import type { StagingMode } from "@/scene/scene";
import styles from "../seed.module.css";
import { guideFromFrame, LAYERS, type Layer, Overlay } from "./Overlay";

const STAGING = [
  { value: "safeframe", label: "safeframe" },
  { value: "center", label: "Centred crop" },
] as const;

export default function Frameguide() {
  const { device, controls } = useDevice("tall-phone", 3);
  const [mode, setMode] = useState<StagingMode>("safeframe");
  const [visible, setVisible] = useState(true);
  const [layers, setLayers] = useState<Set<Layer>>(new Set(["subject", "focal", "text", "safe"]));
  const [staged, setStaged] = useState<Frame | null>(null);
  const onFrame = useCallback((frame: Frame) => setStaged(frame), []);

  // G toggles every guide, unless the visitor is typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "g" || event.key === "G") setVisible((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setLayer = (layer: Layer, on: boolean) =>
    setLayers((current) => {
      const next = new Set(current);
      if (on) next.add(layer);
      else next.delete(layer);
      return next;
    });

  return (
    <div className={styles.seed} data-demo="frameguide">
      <Controls label="Scene">
        {controls}
        <Segmented legend="Staging" value={mode} choices={STAGING} onChange={setMode} />
      </Controls>
      <div className={styles.split}>
        <Screen device={device}>
          <SceneView
            {...device}
            mode={mode}
            progress={0.1}
            onFrame={onFrame}
            overlay={(frame) =>
              visible ? <Overlay guide={guideFromFrame(frame)} layers={layers} /> : null
            }
          />
        </Screen>
        <div className={styles.side}>
          <fieldset className={styles.menu}>
            <legend>Guides</legend>
            <Toggle label="Show guides (G)" checked={visible} onChange={setVisible} />
            {LAYERS.map((layer) => (
              <Toggle
                key={layer.value}
                label={layer.label}
                checked={layers.has(layer.value)}
                disabled={!visible}
                onChange={(on) => setLayer(layer.value, on)}
              />
            ))}
          </fieldset>
          {staged && (
            <Readout
              label="Staging"
              rows={[
                ["Bucket", staged.bucket, "fg-bucket"],
                ["Subject", staged.subjectClipped ? "Cut by the frame" : "Whole", "fg-subject"],
                [
                  "Copy",
                  staged.textOverlap > 0
                    ? `Over the subject (${Math.round(staged.textOverlap * 100)}%)`
                    : "Clear",
                  "fg-copy",
                ],
              ]}
            />
          )}
          <Note>
            The overlay reads the staging safeframe produces, or the data attributes it writes on
            any staged element. Nothing here moves on its own, so there is no reduced-motion variant
            to switch: every change follows a control you set.
          </Note>
        </div>
      </div>
    </div>
  );
}
