// @quartifex/sleeve (L11, 3D / R3F). Wraps a label around a jar, bottle or can: a band of
// the vessel (straight or tapered), how much of the circumference the label covers, where
// the seam sits, UVs that follow the flat die-cut so printed art lands undistorted, the
// die-line itself as SVG, decals placed by angle and height, and finish presets for gloss,
// satin, matte, foil and spot varnish layers. Plain maths and typed arrays here; three.js
// in ./three, React Three Fiber in ./react.

/** The part of the vessel the label sits on. Units are yours (metres, millimetres): keep them consistent. */
export type Band = {
  /** Radius at the bottom edge of the label. */
  radius: number;
  /** Radius at the top edge, for tapered jars and bottles. Default `radius` (a straight cylinder). */
  radiusTop?: number;
  height: number;
  /** Height of the label's bottom edge on the vessel. Default 0. */
  y?: number;
};

export type Mapping = "developed" | "stretch";

export type SleeveOptions = {
  /**
   * How much of the circumference the label covers, in degrees. Default 360, a full sleeve.
   * Above 360 the ends overlap at the seam, the outer end one `thickness` higher.
   */
  coverage?: number;
  /**
   * Where the seam (or the gap, for a part label) sits, in degrees around the vessel's Y
   * axis; 0 faces +Z, 90 faces +X. Default 180: the back. The label's centre faces the opposite way.
   */
  seam?: number;
  /**
   * "developed" (default): UVs follow the flat die-cut, so art drawn on `dieline()` lands
   * undistorted on a taper. "stretch": a plain rectangle is stretched around the band (art
   * squeezes at the narrow end). The two are identical on a straight cylinder.
   */
  mapping?: Mapping;
  /** Columns around the label. Default one per 4 degrees, at least 8. */
  radialSegments?: number;
  /** Rows up the label. Default 1 (the sides of a band are straight). */
  heightSegments?: number;
  /** Gap between the vessel and the label, as a fraction of the radius, so they never z-fight. Default 0.002. */
  lift?: number;
  /** Label stock thickness as a fraction of the radius, used where the ends overlap. Default 0.001. */
  thickness?: number;
  /** Stacking index: each layer sits one `lift` further out than the one below. Default 0. */
  layer?: number;
};

export type SleeveGeometry = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  /** Width over height of the art this geometry expects. */
  aspect: number;
};

export type Dieline = {
  /** "rectangle" on a straight cylinder, "sector" (part of an annulus) on a taper. */
  shape: "rectangle" | "sector";
  /** Bounding box of the flat label. */
  width: number;
  height: number;
  /** Length of the label's side, along the vessel's slope. */
  slant: number;
  /** Sector only: the arcs' radii and the angle between the straight edges, in degrees. */
  innerRadius?: number;
  outerRadius?: number;
  angle?: number;
  /** The cut outline as an SVG path, in label units, origin at the bounding box's top left. */
  path: string;
};

export type Decal = {
  /** Centre of the decal around the vessel, in degrees (0 faces +Z). */
  at: number;
  /** Height of the decal's centre on the vessel. */
  y: number;
  /** Flat size of the decal (the sticker as printed). */
  width: number;
  height: number;
};

/** Material parameters, framework-neutral (they match three's MeshPhysicalMaterial). */
export type FinishParams = {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  /** Adds only reflections to what is under it: clear varnish over a print. */
  additive?: boolean;
};

export type Finish = "gloss" | "satin" | "matte" | "foil" | "varnish";

export const FINISHES: Record<Finish, FinishParams> = {
  gloss: { roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 },
  satin: { roughness: 0.48, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35 },
  matte: { roughness: 0.92, metalness: 0, clearcoat: 0, clearcoatRoughness: 1 },
  foil: { roughness: 0.28, metalness: 1, clearcoat: 0.4, clearcoatRoughness: 0.1 },
  varnish: {
    roughness: 0.06,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    additive: true,
  },
};

const RAD = Math.PI / 180;

type Resolved = {
  r0: number;
  r1: number;
  y0: number;
  height: number;
  coverage: number;
  start: number;
  mapping: Mapping;
  columns: number;
  rows: number;
  lift: number;
  thickness: number;
};

function resolve(band: Band, options: SleeveOptions): Resolved {
  if (!(band.radius > 0) || !(band.height > 0)) {
    throw new Error("sleeve: band radius and height must be positive");
  }
  const r1 = band.radiusTop ?? band.radius;
  if (!(r1 > 0)) throw new Error("sleeve: radiusTop must be positive");
  const coverage = Math.min(Math.max(options.coverage ?? 360, 1), 720);
  const seam = options.seam ?? 180;
  const base = Math.max(band.radius, r1);
  return {
    r0: band.radius,
    r1,
    y0: band.y ?? 0,
    height: band.height,
    coverage,
    // The label is centred opposite the seam.
    start: (seam + 180 - coverage / 2) * RAD,
    mapping: options.mapping ?? "developed",
    columns: Math.max(1, Math.round(options.radialSegments ?? Math.max(8, coverage / 4))),
    rows: Math.max(1, Math.round(options.heightSegments ?? 1)),
    lift: (options.lift ?? 0.002) * base * (1 + (options.layer ?? 0)),
    thickness: (options.thickness ?? 0.001) * base,
  };
}

type Development = {
  shape: "rectangle" | "sector";
  slant: number;
  /** Flat position of the point `t` (0 to 1) along the label and `s` (0 bottom, 1 top) up it, y up. */
  flat: (t: number, s: number) => [number, number];
  sector?: { inner: number; outer: number; angle: number };
};

/** The developed (unrolled) band: a rectangle on a cylinder, a sector of an annulus on a taper. */
function development(r: Resolved): Development {
  const arc = r.coverage * RAD;
  const dr = r.r1 - r.r0;
  const slant = Math.hypot(r.height, dr);
  if (Math.abs(dr) < 1e-9 * Math.max(r.r0, r.r1)) {
    const width = arc * r.r0;
    return { shape: "rectangle", slant, flat: (t, s) => [t * width, s * slant] };
  }
  // A cone's surface unrolls to a sector: distance from the apex is proportional to the radius.
  const k = slant / Math.abs(dr);
  const angle = arc * (Math.abs(dr) / slant);
  // Apex below when the band widens upwards, above when it narrows.
  const up = dr > 0 ? 1 : -1;
  return {
    shape: "sector",
    slant,
    flat: (t, s) => {
      const rho = (r.r0 + dr * s) * k;
      const phi = (t - 0.5) * angle;
      return [rho * Math.sin(phi), up * rho * Math.cos(phi)];
    },
    sector: { inner: Math.min(r.r0, r.r1) * k, outer: Math.max(r.r0, r.r1) * k, angle },
  };
}

function flatBounds(dev: Development) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const steps = dev.shape === "rectangle" ? 1 : 256;
  for (let i = 0; i <= steps; i++) {
    for (const s of [0, 1]) {
      const [x, y] = dev.flat(i / steps, s);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** Width over height of the art to author for this label (the die-line's bounding box, or the plain rectangle for "stretch"). */
export function labelAspect(band: Band, options: SleeveOptions = {}): number {
  const r = resolve(band, options);
  const dev = development(r);
  if (r.mapping === "stretch") return (r.coverage * RAD * (r.r0 + r.r1)) / 2 / dev.slant;
  const box = flatBounds(dev);
  return box.width / box.height;
}

/** Position, normal and UV buffers for the label, ready for any renderer. */
export function sleeveGeometry(band: Band, options: SleeveOptions = {}): SleeveGeometry {
  const r = resolve(band, options);
  const dev = development(r);
  const box = flatBounds(dev);
  const cols = r.columns;
  const rows = r.rows;
  const count = (cols + 1) * (rows + 1);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const indices = new Uint32Array(cols * rows * 6);
  const dr = r.r1 - r.r0;
  // Outward normal of a frustum: (sin θ, -dr/dy, cos θ), normalised.
  const slope = -dr / r.height;
  const scale = 1 / Math.hypot(1, slope);
  const overlap = r.coverage > 360;

  let v = 0;
  for (let j = 0; j <= rows; j++) {
    const s = j / rows;
    for (let i = 0; i <= cols; i++) {
      const t = i / cols;
      const theta = r.start + t * r.coverage * RAD;
      // Where the label wraps past itself, it climbs one stock thickness over its length.
      const radius = r.r0 + dr * s + r.lift + (overlap ? r.thickness * t : 0);
      const sin = Math.sin(theta);
      const cos = Math.cos(theta);
      positions.set([radius * sin, r.y0 + s * r.height, radius * cos], v * 3);
      normals.set([sin * scale, slope * scale, cos * scale], v * 3);
      if (r.mapping === "stretch") {
        uvs.set([t, s], v * 2);
      } else {
        const [x, y] = dev.flat(t, s);
        uvs.set([(x - box.minX) / box.width, (y - box.minY) / box.height], v * 2);
      }
      v++;
    }
  }
  let n = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      // Counter-clockwise seen from outside.
      indices.set([a, b, c, b, d, c], n);
      n += 6;
    }
  }
  return { positions, normals, uvs, indices, aspect: labelAspect(band, options) };
}

const num = (n: number) => Number(n.toFixed(3)).toString();

/** The flat label's cut outline: what goes to the printer as the die-line. */
export function dieline(band: Band, options: SleeveOptions = {}): Dieline {
  const r = resolve(band, options);
  const dev = development(r);
  const box = flatBounds(dev);
  // SVG has y down: flip, and move the box's top left to the origin.
  const p = (t: number, s: number) => {
    const [x, y] = dev.flat(t, s);
    return `${num(x - box.minX)} ${num(box.minY + box.height - y)}`;
  };
  if (!dev.sector) {
    return {
      shape: "rectangle",
      width: box.width,
      height: box.height,
      slant: dev.slant,
      path: `M${p(0, 0)} L${p(1, 0)} L${p(1, 1)} L${p(0, 1)} Z`,
    };
  }
  const { inner, outer, angle } = dev.sector;
  const large = angle > Math.PI ? 1 : 0;
  const widens = r.r1 > r.r0;
  const bottom = widens ? inner : outer;
  const top = widens ? outer : inner;
  // Left to right along the bottom arc, back along the top one. With the apex below
  // (widening) the bottom arc turns clockwise on screen; with it above, anticlockwise.
  const path = [
    `M${p(0, 0)}`,
    `A${num(bottom)} ${num(bottom)} 0 ${large} ${widens ? 1 : 0} ${p(1, 0)}`,
    `L${p(1, 1)}`,
    `A${num(top)} ${num(top)} 0 ${large} ${widens ? 0 : 1} ${p(0, 1)}`,
    "Z",
  ].join(" ");
  return {
    shape: "sector",
    width: box.width,
    height: box.height,
    slant: dev.slant,
    innerRadius: inner,
    outerRadius: outer,
    angle: angle / RAD,
    path,
  };
}

/**
 * Where a point of the label lands on the die-line: `t` (0 to 1) along the label, left to
 * right, and `s` (0 bottom, 1 top) up it, in the die-line's coordinates (y down, origin at
 * the top left). Use it to lay art onto a sector, or to place marks on a print template.
 */
export function dielinePoint(
  band: Band,
  options: SleeveOptions,
  t: number,
  s: number,
): [number, number] {
  const dev = development(resolve(band, options));
  const box = flatBounds(dev);
  const [x, y] = dev.flat(t, s);
  return [x - box.minX, box.minY + box.height - y];
}

/** The die-line as a standalone SVG document, sized in `unit` (e.g. "mm"). */
export function dielineSvg(
  band: Band,
  options: SleeveOptions = {},
  svg: { unit?: string; stroke?: string } = {},
): string {
  const d = dieline(band, options);
  const unit = svg.unit ?? "";
  const pad = Math.max(d.width, d.height) * 0.02;
  const w = d.width + pad * 2;
  const h = d.height + pad * 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(w)}${unit}" height="${num(h)}${unit}" viewBox="${num(-pad)} ${num(-pad)} ${num(w)} ${num(h)}">`,
    `<title>Die-line: ${d.shape}, ${num(d.width)} x ${num(d.height)}${unit}</title>`,
    `<path d="${d.path}" fill="none" stroke="${svg.stroke ?? "#000"}" stroke-width="${num(pad / 8)}"/>`,
    "</svg>",
  ].join("");
}

/** Radius of the band at height `y` (clamped to the band). */
export function radiusAt(band: Band, y: number): number {
  const r1 = band.radiusTop ?? band.radius;
  const s = Math.min(Math.max((y - (band.y ?? 0)) / band.height, 0), 1);
  return band.radius + (r1 - band.radius) * s;
}

/**
 * The band and options for a decal: a patch of the band centred at `at` degrees and height
 * `y`, as wide (along the surface) and tall (along the slope) as the printed sticker.
 * Pass both to `sleeveGeometry`, with a `layer` above the label's.
 */
export function decalPatch(band: Band, decal: Decal): { band: Band; options: SleeveOptions } {
  const r1 = band.radiusTop ?? band.radius;
  const slant = Math.hypot(band.height, r1 - band.radius);
  // Height along the vessel's axis that matches the sticker's height along the slope.
  const dy = (decal.height * band.height) / slant;
  const y0 = decal.y - dy / 2;
  const coverage = decal.width / radiusAt(band, decal.y) / RAD;
  return {
    band: { radius: radiusAt(band, y0), radiusTop: radiusAt(band, y0 + dy), height: dy, y: y0 },
    options: {
      coverage,
      seam: decal.at + 180,
      mapping: "developed",
      radialSegments: Math.max(4, Math.ceil(coverage / 4)),
    },
  };
}
