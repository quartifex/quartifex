// The feature chapters (A1 to A6): what each says, which requirements it rests on, and how far
// the research behind it went. Rear-seat work was researched and user-tested; the driver and
// co-pilot modes are a design extension, not yet user-tested. Requirement IDs are the Volere
// cards' (content/volere.ts).

export type Status = "tested" | "researched" | "extension";

export type Feature = {
  id: string;
  coord: string;
  title: string;
  muted: string;
  lede: string;
  notes: [{ head: string; body: string }, { head: string; body: string }];
  ids: string[];
  status: Status;
  /** The oversized word set behind the scene. */
  word: string;
};

export const STATUS_LABEL: Record<Status, string> = {
  tested: "Rear seat: researched and user-tested",
  researched: "From the rear-seat research",
  extension: "Design extension, not yet user-tested",
};

export const FEATURES: Feature[] = [
  {
    id: "seats",
    coord: "A1 · Every seat",
    title: "Four screens.",
    muted: "Four ways to ride.",
    lede: "Each seat has a mode of its own, and one system behind them all: the same media, the same route, the same car, shaped for whoever is sitting there.",
    notes: [
      {
        head: "Driver · Glance",
        body: "Big targets, short tasks, voice and wheel controls first. Nothing that holds the eyes.",
      },
      {
        head: "Rear · Lounge",
        body: "Films, music, the route and the cabin's climate, for the long part of the journey.",
      },
    ],
    ids: ["A", "C", "L", "P"],
    status: "tested",
    word: "SEATS",
  },
  {
    id: "driver",
    coord: "A2 · Driver",
    title: "Calm for the driver.",
    muted: "Built to the two-second glance.",
    lede: "When the car moves, the driver's screen changes shape: video and long text lock, targets grow, and tasks move to voice and the controls on the wheel.",
    notes: [
      {
        head: "Moving",
        body: "Video, the media library and settings lock. What stays is large and short: the route, the call, the song.",
      },
      {
        head: "The rule we design to",
        body: "Single glances of 2 seconds or less, and 12 seconds or less to finish a task (NHTSA, 2013).",
      },
    ],
    ids: ["A", "B", "E", "I"],
    status: "extension",
    word: "GLANCE",
  },
  {
    id: "share",
    coord: "A3 · Content sharing",
    title: "Send it to the back.",
    muted: "It plays when they say yes.",
    lede: "A film, a song or a place moves from one screen to another. Nothing takes over a screen: its passenger accepts it, or not now.",
    notes: [
      {
        head: "From the front",
        body: "The co-pilot finds a film for the long stretch and sends it to the rear left screen.",
      },
      {
        head: "To the back",
        body: "Rear left sees who sent it and what it is, with Play here or Not now.",
      },
    ],
    ids: ["Y", "K", "C"],
    status: "researched",
    word: "SHARE",
  },
  {
    id: "climate",
    coord: "A4 · Climate",
    title: "Four zones.",
    muted: "Each seat sets its own.",
    lede: "Temperature, fan and seat comfort per seat, with one switch to keep the rear seats in step. Routines bring a whole setting back with one press.",
    notes: [
      {
        head: "Per seat",
        body: "Each passenger changes their own zone from their own screen; the driver uses steps, not a slider.",
      },
      {
        head: "Routines",
        body: "Time, place and climate presets: the morning commute, the late drive home.",
      },
    ],
    ids: ["V", "J", "N"],
    status: "tested",
    word: "CLIMATE",
  },
  {
    id: "road",
    coord: "A5 · Journey",
    title: "The road, explained.",
    muted: "Places and the ETA over the view ahead.",
    lede: "The route with its ETA, and an augmented view that labels what is around the car: places to stop, to eat, to charge.",
    notes: [
      {
        head: "AR view",
        body: "Points of interest pinned to the view ahead, with distance. Passengers can send one to the driver's route.",
      },
      {
        head: "Recommendations",
        body: "Shows and music picked to fit the time left in the journey.",
      },
    ],
    ids: ["D", "G", "M", "U"],
    status: "tested",
    word: "ROUTE",
  },
  {
    id: "sos",
    coord: "A6 · Safety",
    title: "Help, from any seat.",
    muted: "With five seconds to change your mind.",
    lede: "SOS works from every screen and from a physical button. A countdown with a cancel guards against a mistaken press, and every screen shows what is happening.",
    notes: [
      {
        head: "Countdown",
        body: "Five seconds, a single large Cancel, and the call placed only when the count ends.",
      },
      {
        head: "Every screen knows",
        body: "The hazard lights come on and every passenger sees that help is on the way.",
      },
    ],
    ids: ["I", "X"],
    status: "tested",
    word: "SOS",
  },
];
