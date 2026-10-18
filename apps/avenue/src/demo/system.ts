// The demo's shared state: one reducer for the whole car, so every screen reads the same
// truth. Pure and framework-free (the tests drive it directly). The driver-lockout rules live
// here, not in the components, so no screen can forget them.
import type { ModuleId } from "@/content/modules";

export type SeatId = "driver" | "copilot" | "rearLeft" | "rearRight";
export const SEAT_IDS: readonly SeatId[] = ["driver", "copilot", "rearLeft", "rearRight"];
export const SEAT_NAME: Record<SeatId, string> = {
  driver: "Driver",
  copilot: "Co-pilot",
  rearLeft: "Rear left",
  rearRight: "Rear right",
};

export type MediaKind = "show" | "film" | "music" | "podcast";
export type MediaItem = {
  id: string;
  title: string;
  by: string;
  kind: MediaKind;
  minutes: number;
  /** Video is what the driver's screen locks while moving. */
  video: boolean;
  /** Art: a hue (degrees) and a pattern seed, drawn in code. */
  hue: number;
  seed: number;
  /** Music only: the AVENUE Radio station that generates it. */
  station?: Station;
};

export type Station = "edm" | "lofi";
export const STATION_NAME: Record<Station, string> = { edm: "EDM", lofi: "Lo-fi" };

// Invented titles and makers, for illustration. Music is generated live in the browser by
// AVENUE Radio (radio.ts): each track is a seed for one of two stations, EDM or lo-fi.
export const LIBRARY: readonly MediaItem[] = [
  {
    id: "slow-roads",
    title: "Slow Roads",
    by: "Episode 4",
    kind: "show",
    minutes: 40,
    video: true,
    hue: 30,
    seed: 1,
  },
  {
    id: "cartographers",
    title: "The Cartographers",
    by: "Episode 2",
    kind: "show",
    minutes: 30,
    video: true,
    hue: 210,
    seed: 2,
  },
  {
    id: "night-ferry",
    title: "Night Ferry",
    by: "Episode 1",
    kind: "show",
    minutes: 50,
    video: true,
    hue: 250,
    seed: 3,
  },
  {
    id: "small-kitchens",
    title: "Small Kitchens",
    by: "Episode 7",
    kind: "show",
    minutes: 25,
    video: true,
    hue: 18,
    seed: 4,
  },
  {
    id: "northbound",
    title: "Northbound",
    by: "Film, 1 h 52",
    kind: "film",
    minutes: 112,
    video: true,
    hue: 200,
    seed: 5,
  },
  {
    id: "paper-lanterns",
    title: "Paper Lanterns",
    by: "Film, 1 h 38",
    kind: "film",
    minutes: 98,
    video: true,
    hue: 38,
    seed: 6,
  },
  {
    id: "quiet-coast",
    title: "The Quiet Coast",
    by: "Film, 2 h 04",
    kind: "film",
    minutes: 124,
    video: true,
    hue: 190,
    seed: 7,
  },
  {
    id: "neon-causeway",
    title: "Neon Causeway",
    by: "AVENUE Radio · EDM",
    kind: "music",
    minutes: 6,
    video: false,
    hue: 222,
    seed: 8,
    station: "edm",
  },
  {
    id: "sea-link",
    title: "Sea Link at 2 AM",
    by: "AVENUE Radio · EDM",
    kind: "music",
    minutes: 6,
    video: false,
    hue: 280,
    seed: 9,
    station: "edm",
  },
  {
    id: "late-light",
    title: "Late Light",
    by: "AVENUE Radio · Lo-fi",
    kind: "music",
    minutes: 5,
    video: false,
    hue: 34,
    seed: 10,
    station: "lofi",
  },
  {
    id: "monsoon-window",
    title: "Monsoon Window",
    by: "AVENUE Radio · Lo-fi",
    kind: "music",
    minutes: 5,
    video: false,
    hue: 190,
    seed: 11,
    station: "lofi",
  },
  {
    id: "field-notes",
    title: "Field Notes",
    by: "Podcast, 45 min",
    kind: "podcast",
    minutes: 45,
    video: false,
    hue: 24,
    seed: 12,
  },
  {
    id: "long-table",
    title: "The Long Table",
    by: "Podcast, 52 min",
    kind: "podcast",
    minutes: 52,
    video: false,
    hue: 220,
    seed: 13,
  },
];

export const MEDIA_BY_ID = Object.fromEntries(LIBRARY.map((m) => [m.id, m])) as Record<
  string,
  MediaItem
>;

// The demo journey, across Mumbai on the coastal road (the map is a Google Maps capture).
export const JOURNEY = {
  from: "Bandra West",
  to: "Colaba",
  via: "Coastal Road",
  etaMinutes: 33,
  arrive: "21:48",
  km: 19.9,
  nextTurn: "In 600 m, keep left for Coastal Road",
  next: { distance: "600 m", action: "Keep left", road: "Coastal Road" },
  places: [
    { id: "lumen", name: "Café Lumen", kind: "Café", distance: "300 m", side: "left" as const },
    {
      id: "charge",
      name: "Charging hub",
      kind: "6 chargers free",
      distance: "1.2 km",
      side: "right" as const,
    },
    {
      id: "sorrel",
      name: "Sorrel Bakery",
      kind: "Bakery",
      distance: "650 m",
      side: "left" as const,
    },
  ],
};

/** What the car reports to the driver's cluster (illustrative values). */
export const VEHICLE = {
  speedLimit: 80,
  setSpeed: 80,
  rangeKm: 312,
  battery: 0.74,
  gear: "D",
  outside: 29,
};

/** The seat screen's look: light or dark, and an accent colour. */
export type OsTheme = "dark" | "light";
export const ACCENTS = [
  { id: "lane", name: "Lane blue", value: "#2d63ee" },
  { id: "jade", name: "Jade", value: "#0f9d7a" },
  { id: "violet", name: "Violet", value: "#6b4bff" },
  { id: "amber", name: "Amber", value: "#c77700" },
  { id: "rose", name: "Rose", value: "#d23f74" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];

/** What the screen is showing when it is not the interface: off, a clock, a slideshow. */
export type DisplayMode = "on" | "off" | "clock" | "slideshow";

/** Apps a passenger can install from the store (invented for the demo). */
export const STORE_APPS = [
  {
    id: "parkwise",
    name: "Parkwise",
    what: "Find and pay for parking near the destination",
    icon: "pin",
    hue: 205,
  },
  {
    id: "plugmap",
    name: "PlugMap",
    what: "Chargers on the route, with live availability",
    icon: "bolt",
    hue: 150,
  },
  {
    id: "tidepool",
    name: "Tidepool",
    what: "Podcasts and audiobooks, downloaded for the trip",
    icon: "radio",
    hue: 265,
  },
  {
    id: "storytime",
    name: "Storytime",
    what: "Read-along stories for children in the back",
    icon: "media",
    hue: 25,
  },
  {
    id: "wordquest",
    name: "Word Quest",
    what: "A word game two seats can play together",
    icon: "grid",
    hue: 320,
  },
  {
    id: "skyglass",
    name: "Skyglass",
    what: "Weather along the route, hour by hour",
    icon: "sun",
    hue: 45,
  },
] as const;
export type StoreAppId = (typeof STORE_APPS)[number]["id"];

export type Notification = {
  id: string;
  title: string;
  body: string;
  icon: "inbox" | "routines" | "settings" | "bolt" | "phone" | "check";
};

export type Share = {
  id: string;
  from: SeatId;
  kind: "media" | "place" | "clip";
  ref: string;
  title: string;
};

export type SeatState = {
  module: ModuleId;
  nowPlaying: string | null;
  playing: boolean;
  /** 0 to 1 through the item. */
  progress: number;
  clip: "ready" | "recording" | "saved";
  textScale: 1 | 1.15 | 1.3;
  brightness: number;
  inbox: Share[];
  theme: OsTheme;
  accent: AccentId;
  display: DisplayMode;
  /** Do not disturb: shares and notifications wait quietly. */
  dnd: boolean;
  /** A YouTube video or mix playing on this screen. */
  video: string | null;
  /** The store app open, when module is "app". */
  app: StoreAppId | null;
};

export type Routine = { id: string; name: string; detail: string; on: boolean };

export type Clip = { id: string; title: string; seat: SeatId; seconds: number };

export type System = {
  moving: boolean;
  seats: Record<SeatId, SeatState>;
  zones: Record<SeatId, { temp: number; fan: number }>;
  airflow: "face" | "feet" | "both" | "auto";
  fresh: boolean;
  syncRear: boolean;
  ambient: number;
  reading: Record<SeatId, boolean>;
  massage: Record<SeatId, boolean>;
  routines: Routine[];
  clips: Clip[];
  sos: { state: "idle" | "counting" | "calling"; from: SeatId | null; remaining: number };
  settings: {
    wifi: boolean;
    bluetooth: boolean;
    location: boolean;
    analytics: boolean;
    highContrast: boolean;
    captions: boolean;
  };
  sound: boolean;
  /** Cab mode: the rear screens become a rider's screen (trip, pull over, help, quiet ride). */
  fleet: boolean;
  ride: { quiet: boolean; stop: "none" | "requested"; help: boolean };
  /** The co-pilot's privacy shield: their screen cannot be seen from the driver's seat. */
  shield: boolean;
  heat: Record<SeatId, number>;
  vent: Record<SeatId, number>;
  volume: Record<SeatId, number>;
  /** Apps installed from the store, for the whole car. */
  installed: StoreAppId[];
  /** Casting from a phone to one seat's screen. */
  cast: { seat: SeatId | null; state: "idle" | "pairing" | "casting"; device: string };
  dismissed: string[];
  /** The latest message for the live region, with a counter so repeats are announced. */
  notice: { text: string; seat: SeatId | "all"; n: number };
};

const seat = (module: ModuleId, nowPlaying: string | null, playing = false): SeatState => ({
  module,
  nowPlaying,
  playing,
  progress: 0.18,
  clip: "ready",
  textScale: 1,
  brightness: 0.8,
  inbox: [],
  theme: "dark",
  accent: "lane",
  display: "on",
  dnd: false,
  video: null,
  app: null,
});

/** YouTube Music's mixes count as audio: allowed for the driver while moving. */
let MUSIC_VIDEOS = new Set<string>();
export function registerMusicVideos(ids: readonly string[]) {
  MUSIC_VIDEOS = new Set(ids);
}

export function initialSystem(): System {
  return {
    moving: true,
    seats: {
      driver: seat("home", "late-light", true),
      copilot: seat("journey", "neon-causeway", true),
      rearLeft: seat("media", "cartographers", true),
      rearRight: seat("home", "monsoon-window", true),
    },
    zones: {
      driver: { temp: 21, fan: 2 },
      copilot: { temp: 21.5, fan: 2 },
      rearLeft: { temp: 22, fan: 1 },
      rearRight: { temp: 22, fan: 1 },
    },
    airflow: "auto",
    fresh: true,
    syncRear: true,
    ambient: 0.35,
    reading: { driver: false, copilot: false, rearLeft: false, rearRight: true },
    massage: { driver: false, copilot: false, rearLeft: false, rearRight: false },
    routines: [
      {
        id: "unwind",
        name: "Unwind",
        detail: "Warm light, 22°, podcasts on the rear screens",
        on: false,
      },
      {
        id: "work",
        name: "Work day",
        detail: "Quiet cabin, reading lights, calls through the rear seats",
        on: false,
      },
      {
        id: "late",
        name: "Late drive",
        detail: "Dim screens to 30%, cabin lights off, cool air",
        on: true,
      },
      {
        id: "kids",
        name: "Long trip with kids",
        detail: "Rear screens share one film, volume capped",
        on: false,
      },
    ],
    clips: [
      { id: "c1", title: "Coast road at dusk", seat: "rearLeft", seconds: 18 },
      { id: "c2", title: "The ferry crossing", seat: "rearRight", seconds: 24 },
    ],
    sos: { state: "idle", from: null, remaining: 5 },
    settings: {
      wifi: true,
      bluetooth: true,
      location: true,
      analytics: false,
      highContrast: false,
      captions: true,
    },
    sound: false,
    fleet: false,
    ride: { quiet: false, stop: "none", help: false },
    shield: true,
    heat: { driver: 0, copilot: 1, rearLeft: 0, rearRight: 0 },
    vent: { driver: 1, copilot: 0, rearLeft: 0, rearRight: 0 },
    volume: { driver: 0.6, copilot: 0.55, rearLeft: 0.7, rearRight: 0.5 },
    installed: ["plugmap"],
    cast: { seat: null, state: "idle", device: "Pixel 9 (demo phone)" },
    dismissed: [],
    notice: { text: "", seat: "all", n: 0 },
  };
}

export type Action =
  | { type: "moving"; on: boolean }
  | { type: "open"; seat: SeatId; module: ModuleId }
  | { type: "play"; seat: SeatId; id: string }
  | { type: "toggle-play"; seat: SeatId }
  | { type: "seek"; seat: SeatId; to: number }
  | { type: "share"; from: SeatId; to: SeatId; kind: Share["kind"]; ref: string; title: string }
  | { type: "accept"; seat: SeatId; id: string }
  | { type: "decline"; seat: SeatId; id: string }
  | { type: "temp"; seat: SeatId; by: number }
  | { type: "fan"; seat: SeatId; to: number }
  | { type: "airflow"; to: System["airflow"] }
  | { type: "fresh"; on: boolean }
  | { type: "sync-rear"; on: boolean }
  | { type: "ambient"; to: number }
  | { type: "reading"; seat: SeatId }
  | { type: "massage"; seat: SeatId }
  | { type: "routine"; id: string }
  | { type: "clip-start"; seat: SeatId }
  | { type: "clip-stop"; seat: SeatId }
  | { type: "clip-discard"; seat: SeatId }
  | { type: "sos-start"; seat: SeatId }
  | { type: "sos-tick" }
  | { type: "sos-cancel" }
  | { type: "setting"; key: keyof System["settings"]; on: boolean }
  | { type: "text-scale"; seat: SeatId; to: SeatState["textScale"] }
  | { type: "brightness"; seat: SeatId; to: number }
  | { type: "sound"; on: boolean }
  | { type: "fleet"; on: boolean }
  | { type: "quiet"; on: boolean }
  | { type: "pull-over" }
  | { type: "help"; on: boolean }
  | { type: "shield"; on: boolean }
  | { type: "heat"; seat: SeatId; to: number }
  | { type: "vent"; seat: SeatId; to: number }
  | { type: "volume"; seat: SeatId; to: number }
  | { type: "theme"; seat: SeatId; to: OsTheme }
  | { type: "accent"; seat: SeatId; to: AccentId }
  | { type: "display"; seat: SeatId; to: DisplayMode }
  | { type: "dnd"; seat: SeatId; on: boolean }
  | { type: "video"; seat: SeatId; id: string | null }
  | { type: "install"; id: StoreAppId }
  | { type: "uninstall"; id: StoreAppId }
  | { type: "open-app"; seat: SeatId; id: StoreAppId }
  | { type: "cast"; seat: SeatId; to: "pairing" | "casting" | "idle" }
  | { type: "dismiss"; id: string }
  | { type: "tick"; seconds: number };

/** Modules the driver cannot open while the car is moving. */
export const DRIVER_LOCKED_MODULES: readonly ModuleId[] = [
  "clips",
  "settings",
  "youtube",
  "store",
  "cast",
  "app",
];

/** The notifications a seat sees: shares waiting, the car's own news, minus dismissed ones. */
export function notifications(state: System, seatId: SeatId): Notification[] {
  const list: Notification[] = state.seats[seatId].inbox.map((sh) => ({
    id: `share-${sh.id}`,
    title: `${sh.title}`,
    body: `Sent from the ${SEAT_NAME[sh.from].toLowerCase()} screen`,
    icon: "inbox",
  }));
  const on = state.routines.filter((r) => r.on);
  for (const r of on)
    list.push({
      id: `routine-${r.id}`,
      title: `${r.name} is on`,
      body: r.detail,
      icon: "routines",
    });
  list.push(
    {
      id: "charge",
      title: "Charging hub in 1.2 km",
      body: "6 chargers free, on your route",
      icon: "bolt",
    },
    {
      id: "phone",
      title: "Pixel 9 connected",
      body: "Calls and messages on this seat",
      icon: "phone",
    },
    {
      id: "update",
      title: "AVENUE update ready",
      body: "Installs next time the car is parked",
      icon: "settings",
    },
  );
  if (state.cast.state === "casting" && state.cast.seat === seatId)
    list.unshift({
      id: "casting",
      title: "Casting to this screen",
      body: state.cast.device,
      icon: "phone",
    });
  return list.filter((n) => !state.dismissed.includes(n.id));
}

/** Whether an item may play on a seat's screen right now. */
export function canPlay(state: System, seatId: SeatId, item: MediaItem): boolean {
  if (!state.moving || !item.video) return true;
  if (seatId === "driver") return false;
  // The co-pilot's video needs the privacy shield while moving (as in production cars with a
  // passenger screen), so it never plays in the driver's line of sight.
  if (seatId === "copilot") return state.shield;
  return true;
}

export function canOpen(state: System, seatId: SeatId, module: ModuleId): boolean {
  return !(seatId === "driver" && state.moving && DRIVER_LOCKED_MODULES.includes(module));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function notice(state: System, text: string, seatId: SeatId | "all" = "all"): System["notice"] {
  return { text, seat: seatId, n: state.notice.n + 1 };
}

function patchSeat(state: System, id: SeatId, patch: Partial<SeatState>): System["seats"] {
  return { ...state.seats, [id]: { ...state.seats[id], ...patch } };
}

let nextId = 1;
const uid = (prefix: string) => `${prefix}${nextId++}`;

export function reduce(state: System, action: Action): System {
  switch (action.type) {
    case "moving": {
      if (action.on === state.moving) return state;
      const driver = state.seats.driver;
      const playingVideo = driver.nowPlaying && MEDIA_BY_ID[driver.nowPlaying]?.video;
      const lockedModule = DRIVER_LOCKED_MODULES.includes(driver.module);
      const videoOn = Boolean(driver.video && !MUSIC_VIDEOS.has(driver.video));
      let seats = state.seats;
      if (action.on && (playingVideo || lockedModule || videoOn)) {
        seats = patchSeat(state, "driver", {
          ...(playingVideo ? { playing: false } : {}),
          ...(lockedModule ? { module: "home" } : {}),
          ...(videoOn ? { video: null } : {}),
        });
      }
      const text = action.on
        ? playingVideo
          ? "Moving. Video paused on the driver's screen; send it to a rear screen to keep watching."
          : "Moving. The driver's screen now shows only what can be read at a glance."
        : "Parked. Everything is available on the driver's screen.";
      return { ...state, moving: action.on, seats, notice: notice(state, text, "driver") };
    }
    case "open": {
      if (!canOpen(state, action.seat, action.module)) {
        return { ...state, notice: notice(state, "Available when parked.", action.seat) };
      }
      return { ...state, seats: patchSeat(state, action.seat, { module: action.module }) };
    }
    case "play": {
      const item = MEDIA_BY_ID[action.id];
      if (!item) return state;
      if (!canPlay(state, action.seat, item)) {
        return {
          ...state,
          notice: notice(
            state,
            `${item.title} is video: available when parked, or send it to a rear screen.`,
            action.seat,
          ),
        };
      }
      return {
        ...state,
        seats: patchSeat(state, action.seat, {
          nowPlaying: item.id,
          playing: true,
          progress: 0,
          video: null,
        }),
        notice: notice(state, `Playing ${item.title}.`, action.seat),
      };
    }
    case "toggle-play": {
      const s = state.seats[action.seat];
      const item = s.nowPlaying ? MEDIA_BY_ID[s.nowPlaying] : undefined;
      if (!item) return state;
      if (!s.playing && !canPlay(state, action.seat, item)) {
        return { ...state, notice: notice(state, "Video is available when parked.", action.seat) };
      }
      return {
        ...state,
        seats: patchSeat(state, action.seat, {
          playing: !s.playing,
          ...(!s.playing ? { video: null } : {}),
        }),
      };
    }
    case "seek":
      return {
        ...state,
        seats: patchSeat(state, action.seat, { progress: clamp(action.to, 0, 1) }),
      };
    case "share": {
      if (action.from === action.to) return state;
      const share: Share = {
        id: uid("s"),
        from: action.from,
        kind: action.kind,
        ref: action.ref,
        title: action.title,
      };
      const target = state.seats[action.to];
      return {
        ...state,
        seats: patchSeat(state, action.to, { inbox: [...target.inbox, share].slice(-3) }),
        notice: notice(
          state,
          `Sent ${action.title} to ${SEAT_NAME[action.to].toLowerCase()}.`,
          action.from,
        ),
      };
    }
    case "accept": {
      const s = state.seats[action.seat];
      const share = s.inbox.find((i) => i.id === action.id);
      if (!share) return state;
      const inbox = s.inbox.filter((i) => i.id !== action.id);
      if (share.kind === "media" || share.kind === "clip") {
        const item = MEDIA_BY_ID[share.ref];
        if (item && !canPlay(state, action.seat, item)) {
          return {
            ...state,
            seats: patchSeat(state, action.seat, { inbox }),
            notice: notice(state, "Saved for later: video waits until parked.", action.seat),
          };
        }
        return {
          ...state,
          seats: patchSeat(state, action.seat, {
            inbox,
            module: "media",
            ...(item ? { nowPlaying: item.id, playing: true, progress: 0 } : {}),
          }),
          notice: notice(
            state,
            `Now playing ${share.title}, from ${SEAT_NAME[share.from].toLowerCase()}.`,
            action.seat,
          ),
        };
      }
      return {
        ...state,
        seats: patchSeat(state, action.seat, { inbox, module: "journey" }),
        notice: notice(state, `${share.title} added to the journey.`, action.seat),
      };
    }
    case "decline":
      return {
        ...state,
        seats: patchSeat(state, action.seat, {
          inbox: state.seats[action.seat].inbox.filter((i) => i.id !== action.id),
        }),
      };
    case "temp": {
      const rear = action.seat === "rearLeft" || action.seat === "rearRight";
      const temp = clamp(Math.round((state.zones[action.seat].temp + action.by) * 2) / 2, 16, 28);
      const zones = { ...state.zones, [action.seat]: { ...state.zones[action.seat], temp } };
      if (rear && state.syncRear) {
        zones.rearLeft = { ...zones.rearLeft, temp };
        zones.rearRight = { ...zones.rearRight, temp };
      }
      return { ...state, zones };
    }
    case "fan": {
      const fan = clamp(Math.round(action.to), 0, 4);
      const zones = { ...state.zones, [action.seat]: { ...state.zones[action.seat], fan } };
      const rear = action.seat === "rearLeft" || action.seat === "rearRight";
      if (rear && state.syncRear) {
        zones.rearLeft = { ...zones.rearLeft, fan };
        zones.rearRight = { ...zones.rearRight, fan };
      }
      return { ...state, zones };
    }
    case "airflow":
      return { ...state, airflow: action.to };
    case "fresh":
      return { ...state, fresh: action.on };
    case "sync-rear": {
      if (!action.on) return { ...state, syncRear: false };
      return {
        ...state,
        syncRear: true,
        zones: { ...state.zones, rearRight: { ...state.zones.rearLeft } },
      };
    }
    case "ambient":
      return { ...state, ambient: clamp(action.to, 0, 1) };
    case "reading":
      return {
        ...state,
        reading: { ...state.reading, [action.seat]: !state.reading[action.seat] },
      };
    case "massage":
      return {
        ...state,
        massage: { ...state.massage, [action.seat]: !state.massage[action.seat] },
      };
    case "routine": {
      const routines = state.routines.map((r) => (r.id === action.id ? { ...r, on: !r.on } : r));
      const r = routines.find((x) => x.id === action.id);
      return {
        ...state,
        routines,
        notice: notice(state, r ? `${r.name} ${r.on ? "on" : "off"}.` : ""),
      };
    }
    case "clip-start": {
      if (action.seat === "driver" && state.moving) {
        return { ...state, notice: notice(state, "Available when parked.", action.seat) };
      }
      return {
        ...state,
        seats: patchSeat(state, action.seat, { clip: "recording" }),
        notice: notice(state, "Recording.", action.seat),
      };
    }
    case "clip-stop": {
      if (state.seats[action.seat].clip !== "recording") return state;
      const clip: Clip = {
        id: uid("c"),
        title: `Clip ${state.clips.length + 1}`,
        seat: action.seat,
        seconds: 12,
      };
      return {
        ...state,
        clips: [clip, ...state.clips],
        seats: patchSeat(state, action.seat, { clip: "saved" }),
        notice: notice(state, `${clip.title} saved.`, action.seat),
      };
    }
    case "clip-discard":
      return { ...state, seats: patchSeat(state, action.seat, { clip: "ready" }) };
    case "sos-start":
      if (state.sos.state !== "idle") return state;
      return {
        ...state,
        sos: { state: "counting", from: action.seat, remaining: 5 },
        notice: notice(state, "Emergency call in 5 seconds. Press cancel to stop."),
      };
    case "sos-tick": {
      if (state.sos.state !== "counting") return state;
      const remaining = state.sos.remaining - 1;
      if (remaining <= 0) {
        return {
          ...state,
          sos: { ...state.sos, state: "calling", remaining: 0 },
          notice: notice(state, "Calling emergency services. This is a demo: no call is placed."),
        };
      }
      return { ...state, sos: { ...state.sos, remaining } };
    }
    case "sos-cancel":
      if (state.sos.state === "idle") return state;
      return {
        ...state,
        sos: { state: "idle", from: null, remaining: 5 },
        notice: notice(state, "Emergency call cancelled."),
      };
    case "setting":
      return { ...state, settings: { ...state.settings, [action.key]: action.on } };
    case "text-scale":
      return { ...state, seats: patchSeat(state, action.seat, { textScale: action.to }) };
    case "brightness":
      return {
        ...state,
        seats: patchSeat(state, action.seat, { brightness: clamp(action.to, 0.2, 1) }),
      };
    case "sound":
      return { ...state, sound: action.on };
    case "fleet":
      return {
        ...state,
        fleet: action.on,
        ride: { quiet: false, stop: "none", help: false },
        notice: notice(
          state,
          action.on
            ? "Cab mode. The rear screens are now the rider's screens."
            : "Private car mode.",
        ),
      };
    case "quiet":
      return {
        ...state,
        ride: { ...state.ride, quiet: action.on },
        notice: notice(
          state,
          action.on ? "Quiet ride requested. The driver has been told." : "Quiet ride off.",
        ),
      };
    case "pull-over":
      if (state.ride.stop === "requested")
        return {
          ...state,
          ride: { ...state.ride, stop: "none" },
          notice: notice(state, `Pull over cancelled. Continuing to ${JOURNEY.to}.`),
        };
      return {
        ...state,
        ride: { ...state.ride, stop: "requested" },
        notice: notice(state, "Pulling over at the next safe place, in about 200 m."),
      };
    case "help":
      return {
        ...state,
        ride: { ...state.ride, help: action.on },
        notice: notice(
          state,
          action.on
            ? "Connecting you to rider support. This is a demo: no call is placed."
            : "Support call ended.",
        ),
      };
    case "shield": {
      const co = state.seats.copilot;
      const video = co.nowPlaying ? Boolean(MEDIA_BY_ID[co.nowPlaying]?.video) : false;
      const pause = !action.on && state.moving && video && co.playing;
      return {
        ...state,
        ...(pause ? { seats: patchSeat(state, "copilot", { playing: false }) } : {}),
        shield: action.on,
        notice: notice(
          state,
          action.on
            ? "Privacy shield on: the co-pilot screen is hidden from the driver's seat."
            : "Privacy shield off: video pauses on the co-pilot screen while moving.",
          "copilot",
        ),
      };
    }
    case "heat":
      return {
        ...state,
        heat: { ...state.heat, [action.seat]: clamp(Math.round(action.to), 0, 3) },
      };
    case "vent":
      return {
        ...state,
        vent: { ...state.vent, [action.seat]: clamp(Math.round(action.to), 0, 3) },
      };
    case "theme":
      return { ...state, seats: patchSeat(state, action.seat, { theme: action.to }) };
    case "accent":
      return { ...state, seats: patchSeat(state, action.seat, { accent: action.to }) };
    case "display":
      return { ...state, seats: patchSeat(state, action.seat, { display: action.to }) };
    case "dnd":
      return {
        ...state,
        seats: patchSeat(state, action.seat, { dnd: action.on }),
        notice: notice(
          state,
          action.on ? "Do not disturb on." : "Do not disturb off.",
          action.seat,
        ),
      };
    case "video": {
      if (action.id && action.seat === "driver" && state.moving) {
        const music = action.id && MUSIC_VIDEOS.has(action.id);
        if (!music)
          return {
            ...state,
            notice: notice(state, "Video is available when parked.", action.seat),
          };
      }
      return {
        ...state,
        seats: patchSeat(state, action.seat, {
          video: action.id,
          // One thing plays at a time on a seat: YouTube pauses the seat's own media.
          ...(action.id ? { playing: false } : {}),
        }),
      };
    }
    case "install":
      if (state.installed.includes(action.id)) return state;
      return {
        ...state,
        installed: [...state.installed, action.id],
        notice: notice(state, `${STORE_APPS.find((a) => a.id === action.id)?.name} installed.`),
      };
    case "uninstall":
      return { ...state, installed: state.installed.filter((a) => a !== action.id) };
    case "open-app":
      if (!canOpen(state, action.seat, "app"))
        return { ...state, notice: notice(state, "Available when parked.", action.seat) };
      return {
        ...state,
        seats: patchSeat(state, action.seat, { module: "app", app: action.id }),
      };
    case "cast": {
      if (action.to !== "idle" && !canOpen(state, action.seat, "cast"))
        return { ...state, notice: notice(state, "Available when parked.", action.seat) };
      const text =
        action.to === "pairing"
          ? `Waiting for ${state.cast.device} to accept.`
          : action.to === "casting"
            ? `Casting from ${state.cast.device} to the ${SEAT_NAME[action.seat].toLowerCase()} screen.`
            : "Casting stopped.";
      return {
        ...state,
        cast: { ...state.cast, seat: action.to === "idle" ? null : action.seat, state: action.to },
        notice: notice(state, text, action.seat),
      };
    }
    case "dismiss":
      return { ...state, dismissed: [...state.dismissed, action.id] };
    case "volume":
      return { ...state, volume: { ...state.volume, [action.seat]: clamp(action.to, 0, 1) } };
    case "tick": {
      // Advance whatever is playing, everywhere.
      let changed = false;
      const seats = { ...state.seats };
      for (const id of SEAT_IDS) {
        const s = seats[id];
        if (!s.playing || !s.nowPlaying) continue;
        const item = MEDIA_BY_ID[s.nowPlaying];
        if (!item) continue;
        const progress = Math.min(1, s.progress + action.seconds / (item.minutes * 60));
        seats[id] = { ...s, progress, playing: progress < 1 };
        changed = true;
      }
      return changed ? { ...state, seats } : state;
    }
  }
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}
