// Buffering and drawing maths for reel. Pure, so it is tested without a browser.

export type BufferOptions = {
  /** Frames to load ahead of the current one, in the scroll direction. Default 16. */
  ahead?: number;
  /** Frames to keep behind it. Default 6. */
  behind?: number;
  /** Also load every nth frame across the whole sequence, so a fast scrub always has something close. Default 8; 0 turns it off. */
  sparse?: number;
};

/**
 * Which frames to fetch next, most urgent first: the current frame, then outwards with a
 * bias in the scroll direction, then the sparse frames. Skips anything loaded or in flight.
 */
export function planLoads(
  current: number,
  total: number,
  has: (index: number) => boolean,
  direction: 1 | -1 = 1,
  options: BufferOptions = {},
): number[] {
  const ahead = options.ahead ?? 16;
  const behind = options.behind ?? 6;
  const sparse = options.sparse ?? 8;
  const order: number[] = [];
  const seen = new Set<number>();
  const push = (i: number) => {
    if (i < 0 || i >= total || seen.has(i)) return;
    seen.add(i);
    if (!has(i)) order.push(i);
  };
  push(current);
  for (let d = 1; d <= Math.max(ahead, behind); d++) {
    if (d <= ahead) push(current + d * direction);
    if (d <= behind) push(current - d * direction);
  }
  if (sparse > 0) for (let i = 0; i < total; i += sparse) push(i);
  return order;
}

/** Frames that can be dropped: outside twice the window and not on the sparse grid. */
export function evictable(
  loaded: Iterable<number>,
  current: number,
  options: BufferOptions = {},
): number[] {
  const ahead = (options.ahead ?? 16) * 2;
  const behind = (options.behind ?? 6) * 2;
  const sparse = options.sparse ?? 8;
  const reach = Math.max(ahead, behind);
  return [...loaded].filter(
    (i) => Math.abs(i - current) > reach && !(sparse > 0 && i % sparse === 0),
  );
}

/** The loaded frame closest to `index`, preferring the earlier one on a tie; -1 when none. */
export function nearestLoaded(
  index: number,
  total: number,
  has: (index: number) => boolean,
): number {
  for (let d = 0; d < total; d++) {
    if (index - d >= 0 && has(index - d)) return index - d;
    if (index + d < total && has(index + d)) return index + d;
  }
  return -1;
}

export type Rect = { x: number; y: number; width: number; height: number };

/** Where an image of `source` size lands in a `box`, for cover or contain, centred. */
export function fitRect(
  source: { width: number; height: number },
  box: { width: number; height: number },
  fit: "cover" | "contain" = "cover",
): Rect {
  const scale =
    fit === "cover"
      ? Math.max(box.width / source.width, box.height / source.height)
      : Math.min(box.width / source.width, box.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
}
