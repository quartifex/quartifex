// The jar scene as safeframe sees it, plus the naive baseline every demo compares with:
// the desktop composition centre-cropped with object-fit: cover, copy left where it
// was designed.
import { type Box, defineScene, type Frame, frame, type Size } from "@quartifex/safeframe";
import { ART, drawArt, JAR } from "./art";
import { drawWatch, WATCH } from "./watch";

const DESKTOP_COPY: Box = { x: 0.06, y: 0.28, width: 0.4, height: 0.44 };

/** Text zones per bucket, shared by both props (both sit right of centre). */
const ZONES = {
  textZones: [DESKTOP_COPY],
  buckets: {
    "tall-phone": {
      textZones: [
        { x: 0.07, y: 0.035, width: 0.86, height: 0.2 },
        { x: 0.07, y: 0.8, width: 0.86, height: 0.17 },
      ],
    },
    "phone-landscape": { textZones: [{ x: 0.04, y: 0.1, width: 0.44, height: 0.8 }] },
    // Near-square screens: the desktop zone first, then a narrow column left of a subject
    // that sits right of centre, then bands above and below it.
    tablet: {
      textZones: [
        DESKTOP_COPY,
        { x: 0.05, y: 0.26, width: 0.27, height: 0.48 },
        { x: 0.07, y: 0.04, width: 0.86, height: 0.2 },
        { x: 0.07, y: 0.82, width: 0.86, height: 0.15 },
      ],
    },
    ultrawide: { textZones: [{ x: 0.08, y: 0.28, width: 0.3, height: 0.44 }] },
    // 4:3 laptops and large tablets in landscape: a narrower column if the desktop one would
    // reach the subject.
    laptop: { textZones: [DESKTOP_COPY, { x: 0.05, y: 0.26, width: 0.3, height: 0.48 }] },
  },
};

export const JAR_SCENE = defineScene({
  width: ART.width,
  height: ART.height,
  focal: JAR.focal,
  subject: JAR.subject,
  padding: 0.08,
  ...ZONES,
});

export const WATCH_SCENE = defineScene({
  width: ART.width,
  height: ART.height,
  focal: WATCH.focal,
  subject: WATCH.subject,
  padding: 0.06,
  ...ZONES,
});

export type PropName = "jar" | "watch";

/** Each prop's scene for safeframe, its art, and the copy that goes with it. */
export const PROPS = {
  jar: { scene: JAR_SCENE, prop: JAR, draw: drawArt, title: "A jar, staged for every screen." },
  watch: {
    scene: WATCH_SCENE,
    prop: WATCH,
    draw: drawWatch,
    title: "A watch, staged for every screen.",
  },
} as const;

export type StagingMode = "safeframe" | "center";

/**
 * Stage the jar for a viewport. "center" is the baseline: a centred cover crop with the
 * desktop copy position, reported with the real subject so its failures show.
 */
export function stageJar(mode: StagingMode, size: Size): Frame {
  return stageProp("jar", mode, size);
}

/** Stage a prop's scene for a viewport, by safeframe or by the centred-crop baseline. */
export function stageProp(name: PropName, mode: StagingMode, size: Size): Frame {
  const { scene, prop } = PROPS[name];
  if (mode === "safeframe") return frame(scene, size);
  const naive = frame(
    {
      ...scene,
      focal: { x: 0.5, y: 0.5 },
      subject: { x: 0.5, y: 0.5, width: 0, height: 0 },
      textZones: [DESKTOP_COPY],
      buckets: {},
    },
    size,
    { fit: "cover" },
  );
  const s = prop.subject;
  const subject = {
    x: (s.x * ART.width - naive.region.x) * naive.scale,
    y: (s.y * ART.height - naive.region.y) * naive.scale,
    width: s.width * ART.width * naive.scale,
    height: s.height * ART.height * naive.scale,
  };
  const clipped =
    subject.x < -0.5 ||
    subject.y < -0.5 ||
    subject.x + subject.width > size.width + 0.5 ||
    subject.y + subject.height > size.height + 0.5;
  const text = naive.text;
  const overlapW = text
    ? Math.min(text.x + text.width, subject.x + subject.width) - Math.max(text.x, subject.x)
    : 0;
  const overlapH = text
    ? Math.min(text.y + text.height, subject.y + subject.height) - Math.max(text.y, subject.y)
    : 0;
  const overlap =
    text && overlapW > 0 && overlapH > 0 ? (overlapW * overlapH) / (text.width * text.height) : 0;
  return {
    ...naive,
    subject,
    focal: {
      x: (prop.focal.x * ART.width - naive.region.x) * naive.scale,
      y: (prop.focal.y * ART.height - naive.region.y) * naive.scale,
    },
    subjectClipped: clipped,
    textOverlap: overlap,
  };
}

/** The attribute format safeframe writes, so contactsheet reads both modes the same way. */
export function subjectAttribute(staged: Frame): string {
  const { x, y, width, height } = staged.subject;
  return [x, y, width, height].map((n) => Math.round(n)).join(" ");
}
