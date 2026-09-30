// The jar scene as safeframe sees it, plus the naive baseline every demo compares with:
// the desktop composition centre-cropped with object-fit: cover, copy left where it
// was designed.
import { type Box, defineScene, type Frame, frame, type Size } from "@quartifex/safeframe";
import { ART, JAR } from "./art";

const DESKTOP_COPY: Box = { x: 0.06, y: 0.28, width: 0.4, height: 0.44 };

export const JAR_SCENE = defineScene({
  width: ART.width,
  height: ART.height,
  focal: JAR.focal,
  subject: JAR.subject,
  padding: 0.08,
  textZones: [DESKTOP_COPY],
  buckets: {
    "tall-phone": {
      textZones: [
        { x: 0.07, y: 0.035, width: 0.86, height: 0.2 },
        { x: 0.07, y: 0.8, width: 0.86, height: 0.17 },
      ],
    },
    "phone-landscape": { textZones: [{ x: 0.04, y: 0.1, width: 0.44, height: 0.8 }] },
    tablet: {
      textZones: [DESKTOP_COPY, { x: 0.07, y: 0.04, width: 0.86, height: 0.2 }],
    },
    ultrawide: { textZones: [{ x: 0.08, y: 0.28, width: 0.3, height: 0.44 }] },
  },
});

export type StagingMode = "safeframe" | "center";

/**
 * Stage the jar for a viewport. "center" is the baseline: a centred cover crop with the
 * desktop copy position, reported with the real subject so its failures show.
 */
export function stageJar(mode: StagingMode, size: Size): Frame {
  if (mode === "safeframe") return frame(JAR_SCENE, size);
  const naive = frame(
    {
      ...JAR_SCENE,
      focal: { x: 0.5, y: 0.5 },
      subject: { x: 0.5, y: 0.5, width: 0, height: 0 },
      textZones: [DESKTOP_COPY],
      buckets: {},
    },
    size,
    { fit: "cover" },
  );
  const s = JAR.subject;
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
      x: (JAR.focal.x * ART.width - naive.region.x) * naive.scale,
      y: (JAR.focal.y * ART.height - naive.region.y) * naive.scale,
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
