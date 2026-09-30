// @quartifex/safeframe (L26, Responsive scenes). Art-directed staging for scroll and 3D
// scenes on every screen: each scene declares a subject, a focal point and text-safe
// zones per aspect bucket, and safeframe works out the crop, the camera and where the
// copy goes. Framework-neutral core; React in ./react.
import type { Plumb } from "@quartifex/plumb";
import { type Frame, type FrameOptions, frame, type Scene, type Size } from "./frame.js";

export {
  applyCamera,
  type Bounds,
  type CameraFit,
  type CameraKey,
  type CameraVariant,
  compensatedFov,
  type FitOptions,
  fitCamera,
  type PerspectiveCameraLike,
  sampleCamera,
  type Vec3,
} from "./camera.js";
export {
  type Box,
  type Bucket,
  bucketFor,
  type CanvasLike,
  DEFAULT_BUCKETS,
  defineScene,
  drawFrame,
  type Frame,
  type FrameOptions,
  frame,
  overlapArea,
  type Point,
  type Scene,
  type Size,
  type Staging,
  stagingFor,
} from "./frame.js";

export type SafeframeOptions = FrameOptions & {
  /**
   * Follow the page viewport through plumb instead of observing the element. Use it when
   * the element is a full-screen pinned scene, so mobile toolbars do not re-stage it.
   */
  viewport?: Plumb;
  /** Called with every new staging, including the first. */
  onFrame?: (staged: Frame) => void;
  /** Write CSS variables and data attributes on the element. Default true. */
  writeVars?: boolean;
};

export type Safeframe = {
  /** The current staging. */
  readonly frame: Frame;
  /** Re-stage now, for example after swapping the scene. */
  update(scene?: Scene): void;
  destroy(): void;
};

const px = (value: number) => `${Math.round(value * 100) / 100}px`;
const VARS = [
  "text-x",
  "text-y",
  "text-width",
  "text-height",
  "subject-x",
  "subject-y",
  "subject-width",
  "subject-height",
  "focal-x",
  "focal-y",
] as const;

/**
 * Stage `scene` inside `element` and keep it staged as the element resizes. Writes
 * `--sf-text-*`, `--sf-subject-*` and `--sf-focal-*` (viewport pixels) and
 * `data-sf-bucket` on the element, and `data-sf-subject` for test tools such as
 * contactsheet.
 */
export function createSafeframe(
  element: HTMLElement,
  scene: Scene,
  options: SafeframeOptions = {},
): Safeframe {
  let currentScene = scene;
  const sizeOf = (): Size =>
    options.viewport
      ? { width: options.viewport.viewport.width, height: options.viewport.viewport.height }
      : { width: element.clientWidth, height: element.clientHeight };

  const write = (staged: Frame) => {
    if (options.writeVars === false) return;
    const { text, subject, focal } = staged;
    const values: Record<(typeof VARS)[number], number> = {
      "text-x": text?.x ?? 0,
      "text-y": text?.y ?? 0,
      "text-width": text?.width ?? 0,
      "text-height": text?.height ?? 0,
      "subject-x": subject.x,
      "subject-y": subject.y,
      "subject-width": subject.width,
      "subject-height": subject.height,
      "focal-x": focal.x,
      "focal-y": focal.y,
    };
    for (const name of VARS) element.style.setProperty(`--sf-${name}`, px(values[name]));
    element.dataset.sfBucket = staged.bucket;
    element.dataset.sfSubject = [subject.x, subject.y, subject.width, subject.height]
      .map((n) => Math.round(n))
      .join(" ");
    if (staged.subjectClipped) element.dataset.sfClipped = "";
    else delete element.dataset.sfClipped;
  };

  let current = frame(currentScene, sizeOf(), options);
  const apply = () => {
    current = frame(currentScene, sizeOf(), options);
    write(current);
    options.onFrame?.(current);
  };
  write(current);
  options.onFrame?.(current);

  let stop: () => void;
  if (options.viewport) {
    stop = options.viewport.subscribe(apply);
  } else if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    stop = () => observer.disconnect();
  } else {
    stop = () => {};
  }

  return {
    get frame() {
      return current;
    },
    update(next) {
      if (next) currentScene = next;
      apply();
    },
    destroy() {
      stop();
      if (options.writeVars === false) return;
      for (const name of VARS) element.style.removeProperty(`--sf-${name}`);
      delete element.dataset.sfBucket;
      delete element.dataset.sfSubject;
      delete element.dataset.sfClipped;
    },
  };
}
