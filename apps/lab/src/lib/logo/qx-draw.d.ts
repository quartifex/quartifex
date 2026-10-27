export type LogoParams = {
  squareColor: string;
  markColor: string;
  dark: boolean;
  light: [number, number, number] | null;
};

/** Draws the ring-of-squares mark and the wordmark. `p` is the QRTFX→QUARTIFEX open progress (0–1),
 *  `hoverT` the seconds since the hover wave started (-1 = none). Canvas space is 2661 × 373. */
export function qxDrawLogo(
  ctx: CanvasRenderingContext2D,
  p: number,
  hoverT: number,
  params: LogoParams,
): void;

export const QX_D: unknown;
