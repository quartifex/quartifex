// A synthetic test sequence, drawn as SVG: a jar turning on a hairline floor, with a
// burned-in frame counter. Lets every tool and demo run without footage or client files.

export type SyntheticOptions = { width?: number; height?: number; frames?: number };

/** SVG markup for frame `index` of `frames`. */
export function syntheticFrame(index: number, options: SyntheticOptions = {}): string {
  const W = options.width ?? 1600;
  const H = options.height ?? 900;
  const frames = options.frames ?? 72;
  const t = frames > 1 ? index / (frames - 1) : 0;
  const s = W / 1600;
  const cx = W * 0.7;
  const r = W * 0.08;
  const ry = r * 0.16;
  const top = H * 0.35;
  const bottom = H * 0.76;
  const lidTop = H * 0.27;
  const lidR = r * 0.82;
  const horizon = H * 0.79;
  const bandTop = H * 0.46;
  const bandBottom = H * 0.63;
  const parts: string[] = [];

  parts.push(`<rect width="${W}" height="${H}" fill="#050505"/>`);
  const floor: string[] = [];
  for (let i = 1; i <= 9; i++) {
    const y = horizon + (H - horizon) * (i / 9) ** 1.8;
    floor.push(`M0 ${y.toFixed(1)}H${W}`);
  }
  for (let i = -12; i <= 12; i++) {
    floor.push(
      `M${(cx + i * 18 * s).toFixed(1)} ${horizon.toFixed(1)}L${(cx + i * 260 * s).toFixed(1)} ${H}`,
    );
  }
  parts.push(
    `<path d="${floor.join("")}" stroke="#3fbead" stroke-opacity="0.22" stroke-width="${1.5 * s}" fill="none"/>`,
  );
  parts.push(
    `<path d="M0 ${horizon}H${W}" stroke="#edeae4" stroke-opacity="0.2" stroke-width="${1.5 * s}"/>`,
  );

  // Jar body, lid and rims.
  const body = `M${cx - r} ${top}V${bottom}A${r} ${ry} 0 0 0 ${cx + r} ${bottom}V${top}A${r} ${ry} 0 0 0 ${cx - r} ${top}Z`;
  const lid = `M${cx - lidR} ${lidTop}V${top - ry * 0.4}A${lidR} ${ry * 0.8} 0 0 0 ${cx + lidR} ${top - ry * 0.4}V${lidTop}Z`;
  parts.push(
    `<ellipse cx="${cx}" cy="${bottom + ry * 0.4}" rx="${r * 1.25}" ry="${ry * 1.2}" fill="none" stroke="#3fbead" stroke-opacity="0.35" stroke-width="${2 * s}"/>`,
  );
  parts.push(`<path d="${body}" fill="#0d0e0e" stroke="#3fbead" stroke-width="${2.5 * s}"/>`);
  parts.push(`<path d="${lid}" fill="#0d0e0e" stroke="#3fbead" stroke-width="${2.5 * s}"/>`);
  parts.push(
    `<ellipse cx="${cx}" cy="${lidTop}" rx="${lidR}" ry="${ry * 0.8}" fill="#0d0e0e" stroke="#3fbead" stroke-width="${2.5 * s}"/>`,
  );
  for (const y of [bandTop, bandBottom]) {
    parts.push(
      `<path d="M${cx - r} ${y}A${r} ${ry} 0 0 0 ${cx + r} ${y}" fill="none" stroke="#edeae4" stroke-opacity="0.35" stroke-width="${1.5 * s}"/>`,
    );
  }

  // Label stripes travel round as it turns; one Sindoor dot is the mark.
  const turn = t * Math.PI * 2;
  for (let k = 0; k < 12; k++) {
    const angle = turn + (k * Math.PI) / 6;
    const facing = Math.cos(angle);
    if (facing <= 0) continue;
    const x = cx + r * Math.sin(angle);
    parts.push(
      `<path d="M${x.toFixed(1)} ${(bandTop + ry * facing).toFixed(1)}V${(bandBottom + ry * facing).toFixed(1)}" stroke="#3fbead" stroke-opacity="${(0.15 + facing * 0.6).toFixed(2)}" stroke-width="${1.5 * s}"/>`,
    );
  }
  const mark = Math.cos(turn);
  if (mark > 0) {
    parts.push(
      `<ellipse cx="${(cx + r * 0.9 * Math.sin(turn)).toFixed(1)}" cy="${((bandTop + bandBottom) / 2 + ry * mark).toFixed(1)}" rx="${((9 * mark + 2) * s).toFixed(1)}" ry="${9 * s}" fill="#c1440e"/>`,
    );
  }

  const label = `FRAME ${String(index + 1).padStart(3, "0")} / ${frames}`;
  parts.push(
    `<text x="${40 * s}" y="${56 * s}" fill="#edeae4" fill-opacity="0.55" font-family="monospace" font-size="${22 * s}">${label}</text>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}
