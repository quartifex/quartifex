// @quartifex/understudy (L12, Quality & testing). Framework-neutral core: no React, no
// required GSAP. Adapters live in their own subpath exports (see ./react).

export type Options = {
  /** Force the reduced-motion path. Defaults to the visitor's OS preference. */
  reducedMotion?: boolean;
};

export type Instance = {
  /** True when this instance is running its reduced-motion behaviour. */
  readonly reducedMotion: boolean;
  /** Remove listeners and undo anything the instance changed. */
  destroy(): void;
};

/** Whether the visitor has asked for reduced motion. False where there is no `matchMedia`. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** TODO: replace with the real entry point for understudy. */
export function create(_target: Element, options: Options = {}): Instance {
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  return {
    reducedMotion,
    destroy() {},
  };
}
