// The device matrix. Sizes are CSS pixels and device pixel ratios of representative
// devices, rounded; they are test conditions, not a promise of pixel-exact emulation.
// Names never contain commas, so the CLI can take a comma-separated list.

export type ProfileGroup =
  | "phone"
  | "phone-landscape"
  | "foldable"
  | "tablet"
  | "laptop"
  | "desktop"
  | "ultrawide"
  | "in-app";

export type Profile = {
  name: string;
  group: ProfileGroup;
  width: number;
  height: number;
  dpr: number;
  mobile: boolean;
  touch: boolean;
  userAgent?: string;
};

const IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 15; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

type Row = [
  name: string,
  group: ProfileGroup,
  width: number,
  height: number,
  dpr: number,
  ua?: string,
];

const ROWS: Row[] = [
  ["iPhone SE", "phone", 375, 667, 2, IOS],
  ["iPhone 13 mini", "phone", 375, 812, 3, IOS],
  ["iPhone 15", "phone", 393, 852, 3, IOS],
  ["iPhone 15 Pro Max", "phone", 430, 932, 3, IOS],
  ["Pixel 8", "phone", 412, 915, 2.625, ANDROID],
  ["Galaxy S24", "phone", 360, 780, 3, ANDROID],
  ["Budget Android", "phone", 360, 800, 2, ANDROID],
  ["iPhone SE landscape", "phone-landscape", 667, 375, 2, IOS],
  ["iPhone 15 landscape", "phone-landscape", 852, 393, 3, IOS],
  ["Pixel 8 landscape", "phone-landscape", 915, 412, 2.625, ANDROID],
  ["Galaxy Z Fold closed", "foldable", 344, 882, 2.625, ANDROID],
  ["Galaxy Z Fold open", "foldable", 690, 829, 2.625, ANDROID],
  ["Galaxy Z Fold open landscape", "foldable", 829, 690, 2.625, ANDROID],
  ["Galaxy Z Flip open", "foldable", 360, 880, 3, ANDROID],
  ["Pixel Fold open", "foldable", 841, 701, 2.625, ANDROID],
  ["iPad mini", "tablet", 744, 1133, 2, IPAD],
  ["iPad Air", "tablet", 820, 1180, 2, IPAD],
  ["iPad Air landscape", "tablet", 1180, 820, 2, IPAD],
  ["iPad Air split view half", "tablet", 590, 820, 2, IPAD],
  ["iPad Air split view third", "tablet", 375, 820, 2, IPAD],
  ["iPad Pro 12.9", "tablet", 1024, 1366, 2, IPAD],
  ["iPad Pro 12.9 landscape", "tablet", 1366, 1024, 2, IPAD],
  ["Android tablet", "tablet", 800, 1280, 1.5, ANDROID_TABLET],
  ["Laptop 13in", "laptop", 1280, 800, 2],
  ["MacBook Air 13", "laptop", 1470, 956, 2],
  ["Windows laptop", "laptop", 1366, 768, 1],
  ["Laptop 15in at 125%", "laptop", 1536, 864, 1.25],
  ["Desktop 1080p", "desktop", 1920, 1080, 1],
  ["Desktop 1440p", "desktop", 2560, 1440, 1],
  ["Desktop 4K", "desktop", 3840, 2160, 1],
  ["Desktop 4K at 200%", "desktop", 1920, 1080, 2],
  ["Ultrawide 21:9", "ultrawide", 3440, 1440, 1],
  ["Super ultrawide 32:9", "ultrawide", 5120, 1440, 1],
  ["Instagram in-app iOS", "in-app", 390, 664, 3, `${IOS} Instagram 350.0.0`],
  ["Facebook in-app Android", "in-app", 412, 760, 2.625, `${ANDROID} [FBAN/EMA;FBAV/480.0]`],
  ["LinkedIn in-app iOS", "in-app", 390, 700, 3, `${IOS} LinkedInApp`],
];

/** Every profile, grouped: phones, landscape phones, foldables, tablets, laptops, desktops, ultrawides, in-app browsers. */
export const PROFILES: readonly Profile[] = ROWS.map(([name, group, width, height, dpr, ua]) => {
  const touch = group !== "laptop" && group !== "desktop" && group !== "ultrawide";
  return {
    name,
    group,
    width,
    height,
    dpr,
    mobile: touch && group !== "tablet",
    touch,
    ...(ua ? { userAgent: ua } : {}),
  };
});

export const GROUPS: readonly ProfileGroup[] = [
  "phone",
  "phone-landscape",
  "foldable",
  "tablet",
  "laptop",
  "desktop",
  "ultrawide",
  "in-app",
];

/**
 * Pick profiles by group or name, e.g. `["phone", "Desktop 4K"]`. No selection means
 * all of them. Unknown names throw, so a typo does not silently shrink a run.
 */
export function selectProfiles(selection?: readonly (string | Profile)[]): Profile[] {
  if (!selection || selection.length === 0) return [...PROFILES];
  const picked: Profile[] = [];
  for (const item of selection) {
    if (typeof item !== "string") {
      picked.push(item);
      continue;
    }
    const byGroup = PROFILES.filter((p) => p.group === item);
    const byName = PROFILES.filter((p) => p.name.toLowerCase() === item.toLowerCase());
    const found = byGroup.length ? byGroup : byName;
    if (!found.length) throw new Error(`contactsheet: no profile or group named "${item}"`);
    picked.push(...found);
  }
  return picked.filter((p, i) => picked.findIndex((q) => q.name === p.name) === i);
}
