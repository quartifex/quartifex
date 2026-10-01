// The QUASAR reveal as safeframe sees it: one subject (the core and its disk), one focal
// point, and text zones per aspect bucket so the copy never sits on the subject.
import { type Box, defineScene } from "@quartifex/safeframe";
import geometry from "./geometry.json";

const LEFT: Box = { x: 0.06, y: 0.3, width: 0.36, height: 0.4 };

export const SCENE = defineScene({
  width: geometry.width,
  height: geometry.height,
  focal: geometry.focal,
  subject: geometry.subject,
  padding: 0.25,
  textZones: [LEFT],
  buckets: {
    "tall-phone": {
      textZones: [
        { x: 0.07, y: 0.06, width: 0.86, height: 0.24 },
        { x: 0.07, y: 0.72, width: 0.86, height: 0.22 },
      ],
    },
    "phone-landscape": { textZones: [{ x: 0.04, y: 0.12, width: 0.4, height: 0.76 }] },
    tablet: { textZones: [LEFT, { x: 0.07, y: 0.06, width: 0.86, height: 0.22 }] },
    ultrawide: { textZones: [{ x: 0.1, y: 0.3, width: 0.28, height: 0.4 }] },
  },
});

export const SEQUENCE_URL = "/sequences/quasar/";
export const FRAMES = geometry.frames;
