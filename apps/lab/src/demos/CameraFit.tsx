"use client";

// safeframe's camera fit, drawn: a subject's bounding box and silhouette seen through a
// perspective camera placed by fitCamera(), for the current screen aspect.
import { type Bounds, type CameraFit, fitCamera, type Vec3 } from "@quartifex/safeframe";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controls, Readout, Slider, Toggle } from "@/components/demo/kit";
import styles from "./demos.module.css";

// A jar-shaped subject: 1 unit wide, 1.8 tall.
const BOUNDS: Bounds = { min: { x: -0.5, y: -0.9, z: -0.5 }, max: { x: 0.5, y: 0.9, z: 0.5 } };
const PADDING = 0.1;

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};

/** Project a world point to normalised device coordinates for a fit. */
function projector(fit: CameraFit, aspect: number) {
  const forward = norm(sub(fit.target, fit.position));
  const right = norm(cross(forward, { x: 0, y: 1, z: 0 }));
  const up = cross(right, forward);
  const tanV = Math.tan((fit.fov * Math.PI) / 360);
  const tanH = tanV * aspect;
  return (p: Vec3) => {
    const d = sub(p, fit.position);
    const z = dot(d, forward);
    return { x: dot(d, right) / (z * tanH), y: dot(d, up) / (z * tanV) };
  };
}

function draw(canvas: HTMLCanvasElement, fit: CameraFit, aspect: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const scale = window.devicePixelRatio || 1;
  const toPx = (n: { x: number; y: number }) => ({
    x: ((n.x + 1) / 2) * w,
    y: ((1 - n.y) / 2) * h,
  });
  const project = projector(fit, aspect);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);

  // Padded safe frame.
  ctx.strokeStyle = "rgb(237 234 228 / 0.45)";
  ctx.lineWidth = scale;
  ctx.setLineDash([6 * scale, 4 * scale]);
  ctx.strokeRect(w * PADDING, h * PADDING, w * (1 - 2 * PADDING), h * (1 - 2 * PADDING));
  ctx.setLineDash([]);

  // Bounding box edges.
  const { min, max } = BOUNDS;
  const corners: Vec3[] = [];
  for (const x of [min.x, max.x])
    for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) corners.push({ x, y, z });
  const edges = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ] as const;
  ctx.strokeStyle = "rgb(63 190 173 / 0.45)";
  for (const [a, b] of edges) {
    const pa = toPx(project(corners[a] as Vec3));
    const pb = toPx(project(corners[b] as Vec3));
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  // The jar inside it: two rims and four walls.
  ctx.strokeStyle = "#3fbead";
  ctx.lineWidth = 1.5 * scale;
  for (const y of [min.y, max.y * 0.72, max.y]) {
    ctx.beginPath();
    const r = y === max.y ? 0.4 : 0.5;
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const p = toPx(project({ x: Math.cos(a) * r, y, z: Math.sin(a) * r }));
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const p1 = toPx(project({ x: Math.cos(a) * 0.5, y: min.y, z: Math.sin(a) * 0.5 }));
    const p2 = toPx(project({ x: Math.cos(a) * 0.5, y: max.y * 0.72, z: Math.sin(a) * 0.5 }));
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
}

export function CameraFitPanel({ aspect }: { aspect: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [orbit, setOrbit] = useState(35);
  const [compensate, setCompensate] = useState(true);
  const direction = useMemo(() => {
    const a = (orbit * Math.PI) / 180;
    return { x: Math.sin(a), y: 0.35, z: Math.cos(a) };
  }, [orbit]);
  const fit = useMemo(
    () => fitCamera(BOUNDS, { aspect, direction, padding: PADDING, fov: 35, compensate }),
    [aspect, direction, compensate],
  );
  const plain = useMemo(
    () => fitCamera(BOUNDS, { aspect, direction, padding: PADDING, fov: 35, compensate: false }),
    [aspect, direction],
  );

  const displayHeight = 260;
  const displayWidth = Math.min(displayHeight * aspect, 640);
  const shownHeight = displayWidth / aspect;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.round(displayWidth * dpr);
    el.height = Math.round(shownHeight * dpr);
    draw(el, fit, aspect);
  }, [fit, aspect, displayWidth, shownHeight]);

  const horizontal = (2 * Math.atan(Math.tan((fit.fov * Math.PI) / 360) * aspect) * 180) / Math.PI;
  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>3D: camera fit for this aspect</h3>
      <Controls label="Camera fit">
        <Slider
          label="Orbit"
          value={orbit}
          min={-80}
          max={80}
          step={1}
          onChange={setOrbit}
          format={(v) => `${v}°`}
        />
        <Toggle label="Portrait FOV compensation" checked={compensate} onChange={setCompensate} />
      </Controls>
      <div className={styles.cameraRow}>
        <canvas
          ref={canvas}
          className={styles.cameraCanvas}
          style={{ width: displayWidth, height: shownHeight }}
          role="img"
          aria-label={`A jar-shaped subject framed by the camera at aspect ${aspect.toFixed(2)}, with the padded safe frame dashed.`}
        />
        <Readout
          label="Camera"
          rows={[
            ["Distance", fit.distance.toFixed(2), "cam-distance"],
            ["Vertical FOV", `${fit.fov.toFixed(1)}°`, "cam-fov"],
            ["Horizontal FOV", `${horizontal.toFixed(1)}°`],
            ["Without compensation", `${plain.distance.toFixed(2)} away`],
          ]}
        />
      </div>
    </div>
  );
}
