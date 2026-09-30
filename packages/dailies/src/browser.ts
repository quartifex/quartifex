// Browser-safe parts of @quartifex/dailies, published as `@quartifex/dailies/browser`:
// the pixel comparison and the scroll and frame-timing maths, without Playwright or Node.
export { type JankReport, progressToScroll, type ScrollRange, summariseFrames } from "./math.js";
export {
  type CompareOptions,
  type Comparison,
  compareRgba,
  downsample,
  type Rgba,
} from "./pixels.js";
