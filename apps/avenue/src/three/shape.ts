// The AVENUE concept car, as numbers. One file is the single source for the 3D model (built
// into a GLB at build time by scripts/assets.mjs), the side-profile poster drawn on first
// paint, the image-sequence fallback and the OG image, so they all show the same car.
//
// It is an invented, unbadged four-seat luxury EV: no real marque's silhouette, nothing to
// strip. Units are metres. +Y is up and +Z is the car's left (the driver's side in
// a left-hand-drive car; the docs note the layout mirrors for right-hand drive). The nose
// is at x = 0, so forward is -X.
//
// Plain TypeScript with no imports, so Node can run it directly (type stripping) from the
// build scripts as well as the app.

export const CAR = {
  length: 5.25,
  /** Front and rear axle positions along X. */
  axles: [1.02, 4.25] as const,
  wheelRadius: 0.37,
  tyreWidth: 0.255,
  /** Half the track: wheel centre to the car's centre line. */
  track: 0.835,
  /** The left rear coach door (hinged at its rear edge), the camera's way into the cabin. */
  door: { from: 2.78, to: 3.96 },
  greenhouse: { from: 1.62, to: 4.62 },
};

type Pt = readonly [number, number];

/** A smooth curve through points (monotone cubic, so no overshoot between them). */
export function curve(points: readonly Pt[]): (x: number) => number {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    d.push(
      ((ys[i + 1] as number) - (ys[i] as number)) / ((xs[i + 1] as number) - (xs[i] as number)),
    );
  }
  m.push(d[0] as number);
  for (let i = 1; i < n - 1; i++) {
    const a = d[i - 1] as number;
    const b = d[i] as number;
    m.push(a * b <= 0 ? 0 : (a + b) / 2);
  }
  m.push(d[n - 2] as number);
  for (let i = 0; i < n - 1; i++) {
    const di = d[i] as number;
    if (di === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = (m[i] as number) / di;
    const b = (m[i + 1] as number) / di;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * di;
      m[i + 1] = t * b * di;
    }
  }
  return (x: number) => {
    if (x <= (xs[0] as number)) return ys[0] as number;
    if (x >= (xs[n - 1] as number)) return ys[n - 1] as number;
    let i = 0;
    while (x > (xs[i + 1] as number)) i++;
    const x0 = xs[i] as number;
    const h = (xs[i + 1] as number) - x0;
    const t = (x - x0) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * (ys[i] as number) +
      (t3 - 2 * t2 + t) * h * (m[i] as number) +
      (-2 * t3 + 3 * t2) * (ys[i + 1] as number) +
      (t3 - t2) * h * (m[i + 1] as number)
    );
  };
}

/** Top of the lower body: bumper, bonnet, beltline, boot deck, tail. */
export const topLine = curve([
  [0, 0.6],
  [0.07, 0.7],
  [0.3, 0.79],
  [0.9, 0.89],
  [1.6, 0.97],
  [2.4, 1.0],
  [3.6, 1.02],
  [4.45, 1.03],
  [4.95, 1.0],
  [5.18, 0.88],
  [5.25, 0.74],
]);

const sill = curve([
  [0, 0.42],
  [0.12, 0.3],
  [0.45, 0.23],
  [1.6, 0.21],
  [3.8, 0.21],
  [4.85, 0.24],
  [5.15, 0.32],
  [5.25, 0.46],
]);

const ARCH = 0.445;

/** Bottom edge of the body seen from the side: the sill, rising in an arc over each wheel. */
export function bottomLine(x: number): number {
  let y = sill(x);
  for (const ax of CAR.axles) {
    const dx = x - ax;
    if (Math.abs(dx) < ARCH)
      y = Math.max(y, CAR.wheelRadius + Math.sqrt(ARCH * ARCH - dx * dx) * 0.98);
  }
  return y;
}

/** Half the body's width at X. */
export const halfWidth = curve([
  [0, 0.56],
  [0.1, 0.79],
  [0.38, 0.93],
  [1.0, 0.985],
  [2.6, 1.0],
  [4.2, 0.99],
  [4.85, 0.95],
  [5.14, 0.8],
  [5.25, 0.58],
]);

/** Roofline over the greenhouse. */
export const roofLine = curve([
  [1.62, 0.99],
  [1.95, 1.13],
  [2.45, 1.36],
  [2.85, 1.45],
  [3.6, 1.465],
  [4.05, 1.4],
  [4.4, 1.2],
  [4.62, 1.03],
]);

/** A seat: its cushion's centre (x, z), where its occupant's eyes are, and its screen. */
export type SeatId = "driver" | "copilot" | "rearLeft" | "rearRight";

export type ScreenRect = {
  /** Centre of the screen. */
  center: [number, number, number];
  /** Width and height in metres. */
  size: [number, number];
  /** Every screen faces its occupant (+X); tilt leans its top away from them, in radians. */
  tilt: number;
};

export const SEATS: Record<
  SeatId,
  { eye: [number, number, number]; screen: ScreenRect; x: number; z: number }
> = {
  driver: {
    x: 2.86,
    z: 0.43,
    eye: [3.0, 1.2, 0.43],
    screen: { center: [2.04, 0.99, 0.37], size: [0.66, 0.21], tilt: 0.3 },
  },
  copilot: {
    x: 2.86,
    z: -0.43,
    eye: [3.0, 1.2, -0.43],
    screen: { center: [2.04, 0.99, -0.38], size: [0.58, 0.21], tilt: 0.3 },
  },
  rearLeft: {
    x: 3.86,
    z: 0.44,
    eye: [3.98, 1.18, 0.44],
    screen: { center: [3.26, 1.03, 0.43], size: [0.3, 0.19], tilt: 0.12 },
  },
  rearRight: {
    x: 3.86,
    z: -0.44,
    eye: [3.98, 1.18, -0.44],
    screen: { center: [3.26, 1.03, -0.43], size: [0.3, 0.19], tilt: 0.12 },
  },
};

export const SEAT_ORDER: readonly SeatId[] = ["driver", "copilot", "rearLeft", "rearRight"];

// ---------------------------------------------------------------------------------------
// Meshes. Plain arrays, so the build script can write them to a GLB with glTF-Transform.

export type MaterialName =
  | "paint"
  | "glass"
  | "trim"
  | "underbody"
  | "tyre"
  | "rim"
  | "leather"
  | "cabin"
  | "lightFront"
  | "lightRear"
  | "screen";

export type MeshData = {
  name: string;
  material: MaterialName;
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
};

export type Part = {
  name: string;
  /** Translation of the part's node; vertices are relative to it. */
  at?: [number, number, number];
  meshes: MeshData[];
  children?: Part[];
};

export type Detail = "high" | "low";

const mesh = (name: string, material: MaterialName): MeshData => ({
  name,
  material,
  positions: [],
  normals: [],
  uvs: [],
  indices: [],
});

/** Area-weighted vertex normals from the faces. */
function computeNormals(m: MeshData) {
  const n = new Array<number>(m.positions.length).fill(0);
  const p = m.positions;
  for (let i = 0; i < m.indices.length; i += 3) {
    const a = (m.indices[i] as number) * 3;
    const b = (m.indices[i + 1] as number) * 3;
    const c = (m.indices[i + 2] as number) * 3;
    const ux = (p[b] as number) - (p[a] as number);
    const uy = (p[b + 1] as number) - (p[a + 1] as number);
    const uz = (p[b + 2] as number) - (p[a + 2] as number);
    const vx = (p[c] as number) - (p[a] as number);
    const vy = (p[c + 1] as number) - (p[a + 1] as number);
    const vz = (p[c + 2] as number) - (p[a + 2] as number);
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) {
      n[k] = (n[k] as number) + nx;
      n[k + 1] = (n[k + 1] as number) + ny;
      n[k + 2] = (n[k + 2] as number) + nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i] as number, n[i + 1] as number, n[i + 2] as number) || 1;
    n[i] = (n[i] as number) / l;
    n[i + 1] = (n[i + 1] as number) / l;
    n[i + 2] = (n[i + 2] as number) / l;
  }
  m.normals = n;
}

/** A grid of rings (one per row, `cols` points each) stitched into quads. */
function stitch(
  m: MeshData,
  rows: number,
  cols: number,
  at: (row: number, col: number) => [number, number, number],
  keep: (row: number, col: number) => boolean = () => true,
  closed = false,
) {
  const base = m.positions.length / 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [x, y, z] = at(r, c);
      m.positions.push(x, y, z);
      m.uvs.push(c / (cols - 1), r / (rows - 1));
    }
  }
  const span = closed ? cols : cols - 1;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < span; c++) {
      if (!keep(r, c)) continue;
      const c1 = (c + 1) % cols;
      const a = base + r * cols + c;
      const b = base + r * cols + c1;
      const d = base + (r + 1) * cols + c;
      const e = base + (r + 1) * cols + c1;
      m.indices.push(a, d, b, b, d, e);
    }
  }
}

const sgnPow = (v: number, e: number) => Math.sign(v) * Math.abs(v) ** e;

/** A point on the lower body's cross-section at X; `t` runs 0 to 1 round the section from
 * the bottom centre, through the left side (+Z), over the top and down the right side. */
function bodyPoint(x: number, t: number): [number, number, number] {
  const top = topLine(x);
  const bottom = bottomLine(x);
  const w = halfWidth(x);
  const yc = (top + bottom) / 2;
  const h = (top - bottom) / 2;
  const a = t * Math.PI * 2;
  const s = Math.sin(a);
  const c = Math.cos(a);
  // Fuller shoulder above, gentler tuck below.
  const e = c < 0 ? 2 / 6 : 2 / 3.6;
  return [x, yc - h * sgnPow(c, e), w * sgnPow(s, 2 / 5.5)];
}

function inDoor(x: number, z: number, y: number, bottomY: number) {
  return z > 0.2 && x >= CAR.door.from && x <= CAR.door.to && y > bottomY + 0.05;
}

/** A point on the greenhouse at X; `u` runs -1 (right) to 1 (left) over the roof. */
function glassPoint(x: number, u: number): [number, number, number] {
  const belt = topLine(x) - 0.015;
  const roof = Math.max(belt + 0.001, roofLine(x));
  const w = halfWidth(x);
  const wb = w * 0.955;
  const wr = w * 0.7;
  const a = (u * Math.PI) / 2;
  const zu = sgnPow(Math.sin(a), 2 / 4);
  const yu = Math.abs(Math.cos(a)) ** (2 / 4);
  return [x, belt + yu * (roof - belt), zu * (wb - (wb - wr) * yu)];
}

function body(detail: Detail): {
  shell: MeshData;
  door: MeshData;
  glass: MeshData;
  doorGlass: MeshData;
} {
  const rows = detail === "high" ? 150 : 72;
  const cols = detail === "high" ? 96 : 48;
  const shell = mesh("body", "paint");
  const door = mesh("door-panel", "paint");
  const xAt = (r: number) => {
    // Denser rows at the ends, where the shape turns fastest.
    const t = r / (rows - 1);
    const eased = t - Math.sin(t * Math.PI * 2) * 0.06;
    return eased * CAR.length;
  };
  const at = (r: number, c: number) => bodyPoint(xAt(r), c / cols);
  const centre = (r: number, c: number) => {
    const [x, y, z] = at(r + 0.5, c + 0.5);
    return { x, y, z, bottom: bottomLine(x) };
  };
  stitch(
    shell,
    rows,
    cols,
    at,
    (r, c) => {
      const f = centre(r, c);
      return !inDoor(f.x, f.z, f.y, f.bottom);
    },
    true,
  );
  stitch(
    door,
    rows,
    cols,
    at,
    (r, c) => {
      const f = centre(r, c);
      return inDoor(f.x, f.z, f.y, f.bottom);
    },
    true,
  );
  // Close the nose and tail: a fan to each end's centre.
  for (const [x, flip] of [
    [0, true],
    [CAR.length, false],
  ] as const) {
    const base = shell.positions.length / 3;
    shell.positions.push(x + (flip ? -0.012 : 0.012), (topLine(x) + bottomLine(x)) / 2, 0);
    shell.uvs.push(0.5, 0.5);
    for (let c = 0; c < cols; c++) {
      const [px, py, pz] = bodyPoint(x, c / cols);
      shell.positions.push(px, py, pz);
      shell.uvs.push(c / cols, 0);
    }
    for (let c = 0; c < cols; c++) {
      const a = base + 1 + c;
      const b = base + 1 + ((c + 1) % cols);
      if (flip) shell.indices.push(base, b, a);
      else shell.indices.push(base, a, b);
    }
  }

  const grows = detail === "high" ? 90 : 44;
  const gcols = detail === "high" ? 64 : 32;
  const glass = mesh("glasshouse", "glass");
  const doorGlass = mesh("door-glass", "glass");
  const g = CAR.greenhouse;
  const gat = (r: number, c: number) =>
    glassPoint(g.from + (r / (grows - 1)) * (g.to - g.from), (c / (gcols - 1)) * 2 - 1);
  const gIn = (r: number, c: number) => {
    const [x, y, z] = gat(r + 0.5, c + 0.5);
    const belt = topLine(x);
    const roof = roofLine(x);
    return z > 0.2 && x >= CAR.door.from && x <= CAR.door.to && y < belt + (roof - belt) * 0.8;
  };
  stitch(glass, grows, gcols, gat, (r, c) => !gIn(r, c));
  stitch(doorGlass, grows, gcols, gat, gIn);
  for (const m of [shell, door, glass, doorGlass]) computeNormals(m);
  return { shell, door, glass, doorGlass };
}

/** A box with rounded edges (a superellipsoid), centred on the origin. */
function roundedBox(
  m: MeshData,
  centre: [number, number, number],
  size: [number, number, number],
  detail: Detail,
  sharp = 6,
  rotX = 0,
) {
  const rows = detail === "high" ? 18 : 10;
  const cols = detail === "high" ? 28 : 14;
  const e = 2 / sharp;
  const cr = Math.cos(rotX);
  const sr = Math.sin(rotX);
  stitch(
    m,
    rows,
    cols,
    (r, c) => {
      const v = (r / (rows - 1)) * Math.PI - Math.PI / 2;
      const u = (c / cols) * Math.PI * 2;
      const x = (sgnPow(Math.cos(v), e) * sgnPow(Math.cos(u), e) * size[0]) / 2;
      const y = (sgnPow(Math.sin(v), e) * size[1]) / 2;
      const z = (sgnPow(Math.cos(v), e) * sgnPow(Math.sin(u), e) * size[2]) / 2;
      // Lean about the box's own X axis... applied as a lean towards -X (seat backs recline).
      const yy = y * cr - x * sr;
      const xx = x * cr + y * sr;
      return [centre[0] + xx, centre[1] + yy, centre[2] + z];
    },
    () => true,
    true,
  );
}

function cabin(detail: Detail): MeshData[] {
  const leather = mesh("seats", "leather");
  for (const id of ["driver", "copilot", "rearLeft", "rearRight"] as const) {
    const s = SEATS[id];
    const rear = id.startsWith("rear");
    const w = rear ? 0.6 : 0.56;
    roundedBox(leather, [s.x, 0.5, s.z], [0.56, 0.14, w], detail, 5);
    roundedBox(
      leather,
      [s.x + 0.25, 0.86, s.z],
      [0.13, 0.66, w * 0.94],
      detail,
      5,
      rear ? 0.32 : 0.22,
    );
    roundedBox(leather, [s.x + (rear ? 0.36 : 0.34), 1.27, s.z], [0.11, 0.2, 0.3], detail, 4, 0.2);
  }
  const trim = mesh("cabin-trim", "cabin");
  // Floor, dashboard, a console between the front seats and one between the rear seats.
  roundedBox(trim, [3.1, 0.3, 0], [3.0, 0.06, 1.72], detail, 8);
  roundedBox(trim, [1.86, 0.82, 0], [0.42, 0.26, 1.78], detail, 5, -0.15);
  roundedBox(trim, [2.62, 0.52, 0], [0.62, 0.2, 0.2], detail, 5);
  roundedBox(trim, [3.86, 0.6, 0], [0.62, 0.22, 0.26], detail, 5);
  // Screen housings on the front seat backs and across the dash.
  for (const id of ["rearLeft", "rearRight"] as const) {
    const sc = SEATS[id].screen;
    roundedBox(
      trim,
      [sc.center[0] - 0.018, sc.center[1], sc.center[2]],
      [0.03, sc.size[1] + 0.035, sc.size[0] + 0.035],
      detail,
      8,
      -sc.tilt,
    );
  }
  computeNormals(leather);
  computeNormals(trim);
  return [leather, trim];
}

/** Flat screen panels with UVs 0..1 across, one mesh per seat, for live canvas textures.
 * UV (0, 0) is the screen's top left as its occupant sees it (textures use flipY = false). */
function screens(): MeshData[] {
  const out: MeshData[] = [];
  for (const id of ["driver", "copilot", "rearLeft", "rearRight"] as const) {
    const s = SEATS[id].screen;
    const m = mesh(`screen-${id}`, "screen");
    const [cx, cy, cz] = s.center;
    const [w, h] = s.size;
    const c = Math.cos(s.tilt);
    const sn = Math.sin(s.tilt);
    // Facing +X (the occupant looks along -X); up leans back towards -X by the tilt.
    const corners: Array<[number, number]> = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    for (const [a, b] of corners) {
      const across = (a * w) / 2;
      const up = (b * h) / 2;
      m.positions.push(cx + 0.004 - up * sn, cy + up * c, cz - across);
      m.normals.push(c, sn, 0);
      m.uvs.push((a + 1) / 2, (1 - b) / 2);
    }
    m.indices.push(0, 1, 2, 0, 2, 3);
    out.push(m);
  }
  return out;
}

function lathe(m: MeshData, profile: Array<[number, number]>, segments: number) {
  // Revolve (radius, offset along Z) around the Z axis: a wheel lying in the XY plane.
  stitch(
    m,
    profile.length,
    segments,
    (r, c) => {
      const [radius, z] = profile[r] as [number, number];
      const a = (c / segments) * Math.PI * 2;
      return [Math.cos(a) * radius, Math.sin(a) * radius, z];
    },
    () => true,
    true,
  );
}

function wheel(detail: Detail): MeshData[] {
  const seg = detail === "high" ? 72 : 36;
  const R = CAR.wheelRadius;
  const W = CAR.tyreWidth / 2;
  const tyre = mesh("tyre", "tyre");
  const tyreProfile: Array<[number, number]> = [];
  const steps = detail === "high" ? 14 : 8;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI;
    tyreProfile.push([R - 0.085 + Math.sin(a) * 0.085, -Math.cos(a) * W]);
  }
  lathe(tyre, tyreProfile, seg);
  const rim = mesh("rim", "rim");
  // An aero disc, dished towards the hub, with a raised outer lip.
  lathe(
    rim,
    [
      [0.0, W - 0.01],
      [0.06, W - 0.015],
      [0.12, W - 0.04],
      [0.22, W - 0.055],
      [0.27, W - 0.045],
      [R - 0.09, W - 0.012],
      [R - 0.082, W - 0.03],
    ],
    seg,
  );
  computeNormals(tyre);
  computeNormals(rim);
  return [tyre, rim];
}

function lights(detail: Detail): MeshData[] {
  const front = mesh("light-front", "lightFront");
  const rear = mesh("light-rear", "lightRear");
  const n = detail === "high" ? 48 : 24;
  // Thin bars across the nose and the tail, just proud of the body's end faces.
  const bar = (m: MeshData, x: number, y: number, dir: 1 | -1, span: number) => {
    stitch(m, 2, n, (r, c) => {
      const zz = ((c / (n - 1)) * 2 - 1) * span;
      // Follow the end face's curve in plan: further back towards the corners.
      const back = (Math.abs(zz) / span) ** 4 * 0.05;
      return [x - dir * back, y + (r === 0 ? -0.008 : 0.008), zz];
    });
    for (let i = 0; i < m.positions.length; i += 3) m.normals.push(dir, 0, 0);
  };
  bar(front, -0.018, 0.54, -1, 0.46);
  bar(rear, CAR.length + 0.018, 0.66, 1, 0.48);
  return [front, rear];
}

function underbody(detail: Detail): MeshData {
  const m = mesh("underbody", "underbody");
  roundedBox(m, [CAR.length / 2, 0.42, 0], [CAR.length - 0.5, 0.42, 1.42], detail, 8);
  computeNormals(m);
  return m;
}

/** The whole car as a tree of parts, ready to write to a GLB. */
export function buildCar(detail: Detail): Part {
  const b = body(detail);
  const [tyre, rim] = wheel(detail);
  const wheels: Part[] = [];
  for (const x of CAR.axles) {
    for (const side of [1, -1]) {
      wheels.push({
        name: `wheel-${x < 2 ? "front" : "rear"}-${side > 0 ? "left" : "right"}`,
        at: [x, CAR.wheelRadius, side * CAR.track],
        meshes:
          side > 0
            ? [tyre as MeshData, rim as MeshData]
            : [tyre as MeshData, mirrorZ(rim as MeshData)],
      });
    }
  }
  const hinge: [number, number, number] = [CAR.door.to, 0, halfWidth(CAR.door.to)];
  return {
    name: "avenue",
    meshes: [b.shell, b.glass, underbody(detail), ...lights(detail)],
    children: [
      {
        name: "door-rear-left",
        at: hinge,
        meshes: [offset(b.door, hinge), offset(b.doorGlass, hinge)],
      },
      { name: "cabin", meshes: [...cabin(detail), ...screens()] },
      ...wheels,
    ],
  };
}

function offset(m: MeshData, by: [number, number, number]): MeshData {
  const p = m.positions.slice();
  for (let i = 0; i < p.length; i += 3) {
    p[i] = (p[i] as number) - by[0];
    p[i + 1] = (p[i + 1] as number) - by[1];
    p[i + 2] = (p[i + 2] as number) - by[2];
  }
  return { ...m, positions: p };
}

function mirrorZ(m: MeshData): MeshData {
  const p = m.positions.slice();
  const n = m.normals.slice();
  for (let i = 2; i < p.length; i += 3) {
    p[i] = -(p[i] as number);
    n[i] = -(n[i] as number);
  }
  const idx = m.indices.slice();
  for (let i = 0; i < idx.length; i += 3) {
    const t = idx[i + 1] as number;
    idx[i + 1] = idx[i + 2] as number;
    idx[i + 2] = t;
  }
  return { ...m, name: `${m.name}-mirrored`, positions: p, normals: n, indices: idx };
}

// ---------------------------------------------------------------------------------------
// The side profile, for the poster, the sequence fallback and the OG image.

export type Profile = {
  /** SVG path of the body and glasshouse outline, in metres (y up). */
  body: string;
  glass: string;
  /** Wheel centres. */
  wheels: Array<[number, number]>;
  /** The line along the roof and beltline that catches the light. */
  highlight: string;
};

const f = (v: number) => v.toFixed(3);

export function sideProfile(samples = 120): Profile {
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * CAR.length;
    top.push(`${f(x)} ${f(topLine(x))}`);
    bottom.push(`${f(x)} ${f(bottomLine(x))}`);
  }
  const body = `M${top.join(" L")} L${bottom.reverse().join(" L")} Z`;
  const g = CAR.greenhouse;
  const roof: string[] = [];
  const belt: string[] = [];
  for (let i = 0; i <= samples / 2; i++) {
    const x = g.from + (i / (samples / 2)) * (g.to - g.from);
    roof.push(`${f(x)} ${f(Math.max(roofLine(x), topLine(x)))}`);
    belt.push(`${f(x)} ${f(topLine(x) - 0.01)}`);
  }
  const glass = `M${roof.join(" L")} L${belt.reverse().join(" L")} Z`;
  const hl: string[] = [];
  for (let i = 0; i <= samples / 2; i++) {
    const x = g.from + 0.15 + (i / (samples / 2)) * (g.to - g.from - 0.4);
    hl.push(`${f(x)} ${f(roofLine(x) + 0.004)}`);
  }
  return {
    body,
    glass,
    wheels: CAR.axles.map((x) => [x, CAR.wheelRadius] as [number, number]),
    highlight: `M${hl.join(" L")}`,
  };
}
