// AVENUE's modules: what each one does, its states, the requirement cards it answers, and how
// it behaves per seat mode. The demo's navigation and the docs' module reference both read
// this, so they cannot drift apart.

export type ModuleId = "home" | "media" | "journey" | "climate" | "routines" | "clips" | "settings";

export type SeatMode = "driver" | "copilot" | "rear";

/** How a module behaves for the driver while the car is moving. */
export type DrivingRule = "allowed" | "simplified" | "locked";

export type ModuleSpec = {
  id: ModuleId;
  name: string;
  summary: string;
  states: string[];
  requirements: string[];
  /** Researched and A/B-tested in the rear-seat study, or a design extension. */
  evidence: { rear: "tested" | "extension"; front: "extension" };
  driving: { rule: DrivingRule; detail: string };
};

export const MODULES: readonly ModuleSpec[] = [
  {
    id: "home",
    name: "Home",
    summary:
      "A modular home screen: journey, now playing, weather, time and news as widgets the occupant can rearrange. Each seat keeps its own layout.",
    states: ["Default layout", "Edit layout", "Widget expanded", "Driving (driver only)"],
    requirements: ["O", "W", "P", "U"],
    evidence: { rear: "tested", front: "extension" },
    driving: {
      rule: "simplified",
      detail:
        "Two large widgets (journey and now playing). News headlines and scrolling text are hidden.",
    },
  },
  {
    id: "media",
    name: "Media",
    summary:
      "The content library (shows, films, music, podcasts, downloads), now playing and the queue. Anything playing can be sent to another screen.",
    states: ["Library", "Now playing", "Queue", "Sent to another screen", "Offline downloads"],
    requirements: ["L", "S", "U", "K", "H"],
    evidence: { rear: "tested", front: "extension" },
    driving: {
      rule: "simplified",
      detail:
        "Audio only. Video is locked on the driver's screen while moving; it can be sent to a rear screen instead.",
    },
  },
  {
    id: "journey",
    name: "Journey",
    summary:
      "Navigation with live ETA and an augmented-reality view of points of interest along the route.",
    states: ["Route overview", "Turn guidance", "AR points of interest", "Arrived"],
    requirements: ["G", "D", "M", "E"],
    evidence: { rear: "tested", front: "extension" },
    driving: {
      rule: "simplified",
      detail:
        "A simple two-dimensional map and the next turn. The AR view (camera imagery) is locked for the driver while moving.",
    },
  },
  {
    id: "climate",
    name: "Climate & car",
    summary:
      "Air conditioning per zone, fan and airflow, cabin lighting and seat settings, with an option to sync the rear seats.",
    states: ["Climate", "Lighting", "Seats", "Synced zones", "Reset"],
    requirements: ["V", "A", "I"],
    evidence: { rear: "tested", front: "extension" },
    driving: {
      rule: "allowed",
      detail:
        "Large steppers for temperature; deeper settings move to physical controls and voice.",
    },
  },
  {
    id: "routines",
    name: "Routines",
    summary:
      "Presets that set the cabin by time, place or climate: lighting, temperature and what plays, in one switch.",
    states: ["List", "Routine on", "Routine off", "New routine"],
    requirements: ["J"],
    evidence: { rear: "tested", front: "extension" },
    driving: {
      rule: "simplified",
      detail: "Switch a routine on or off; creating one waits until parked.",
    },
  },
  {
    id: "clips",
    name: "Memory clips",
    summary:
      "Record a moment from the journey, stop, save it, and send it to another screen to watch together (the memory-clipping task flow from the research).",
    states: ["Ready", "Recording", "Saved", "Sent to another screen"],
    requirements: ["Y", "C"],
    evidence: { rear: "tested", front: "extension" },
    driving: { rule: "locked", detail: "Not available to the driver while moving." },
  },
  {
    id: "settings",
    name: "Settings",
    summary:
      "Display brightness, text size, connections, accessibility and privacy, per seat, with system information.",
    states: ["Display", "Accessibility", "Connections", "Privacy"],
    requirements: ["N", "F", "R"],
    evidence: { rear: "tested", front: "extension" },
    driving: {
      rule: "locked",
      detail: "Waits until parked, except brightness on the quick-settings bar.",
    },
  },
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<
  ModuleId,
  ModuleSpec
>;

/** Cross-cutting features that are not a module of their own. */
export const SYSTEM_FEATURES = [
  {
    name: "Content sharing",
    requirements: ["Y", "K", "C"],
    summary:
      "Send what is playing, a place or a clip from one screen to another. The receiving seat accepts or declines; nothing takes over a screen uninvited.",
  },
  {
    name: "SOS",
    requirements: ["I"],
    summary:
      "From any screen: a five-second countdown with a large cancel target, then the call is placed and every screen shows that help is on the way.",
  },
  {
    name: "Driver lockout",
    requirements: ["A", "B", "E"],
    summary:
      "While moving, the driver's screen locks video, long and scrolling text and text entry, enlarges its targets and hands tasks to voice and physical controls.",
  },
] as const;
