// The device specification: the platform AVENUE targets (Android Automotive OS) and a reference
// hardware build to industry-standard specs. These are targets for a partner programme, scoped
// with each partner; they are not the specification of a shipping product. Sources are cited
// for every figure that describes a real part or a real car.

export type SpecRow = { label: string; value: string; note?: string };
export type SpecGroup = { id: string; title: string; kicker: string; rows: SpecRow[] };

export const PLATFORM_NOTE =
  "Reference target for a partner programme, scoped with each partner. Not a shipping product.";

export const OS: SpecGroup = {
  id: "os",
  kicker: "OS",
  title: "Android Automotive OS",
  rows: [
    {
      label: "Base",
      value: "Android Automotive OS 15 (API 35)",
      note: "AOSP build, with Google built-in where the carmaker licenses it.",
    },
    {
      label: "Screens",
      value: "One occupant zone per seat",
      note: "Each seat's display runs as its own user (CarOccupantZoneManager), with its own apps, profile and audio.",
    },
    {
      label: "Driving rules",
      value: "UX restrictions per display",
      note: "Driver display distraction-optimised while moving; passenger displays unrestricted (CarUxRestrictionsManager).",
    },
    {
      label: "Sharing",
      value: "Multi-Display Communications API",
      note: "How a film or a place moves from one seat's screen to another's (new in Android Automotive 15).",
    },
    {
      label: "Audio",
      value: "Multi-zone routing",
      note: "Each occupant zone gets its own audio zone: speakers, headrest speakers or Bluetooth headphones.",
    },
    {
      label: "Car data",
      value: "Vehicle HAL properties",
      note: "Climate per area (HVAC_TEMPERATURE_SET), seat heat and ventilation, cabin lights, gear, speed.",
    },
    {
      label: "Cluster",
      value: "Separate safety partition",
      note: "Speed and telltales render on a safety-qualified OS under a Type-1 hypervisor; AVENUE draws only the navigation and media layers.",
    },
    {
      label: "Updates and security",
      value: "A/B over-the-air, verified boot",
      note: "SELinux enforcing, file-based encryption per user, UN R155 / R156 processes.",
    },
  ],
};

export const HARDWARE: SpecGroup = {
  id: "hardware",
  kicker: "SoC",
  title: "Compute",
  rows: [
    {
      label: "Reference SoC",
      value: "Snapdragon SA8295P class",
      note: "5 nm, over 200K DMIPS CPU, over 3 TFLOPS GPU, 30 TOPS NPU.",
    },
    {
      label: "Next generation",
      value: "Snapdragon Cockpit Elite",
      note: "Oryon CPU, up to 16 4K displays from one chip; in cars from 2026.",
    },
    { label: "Memory", value: "16 to 24 GB LPDDR5", note: "Typical for four-display cockpits." },
    { label: "Storage", value: "256 GB UFS 3.1", note: "Offline downloads per seat." },
    {
      label: "On-device AI",
      value: "Voice and glance, on the NPU",
      note: "Wake word, speech and driver-attention models run in the car, not the cloud.",
    },
  ],
};

export const DISPLAYS: SpecGroup = {
  id: "displays",
  kicker: "Displays",
  title: "Four screens, one system",
  rows: [
    {
      label: "Driver cluster",
      value: '12.3", 1920 × 720',
      note: "1,000 nits, optically bonded. Speed, ADAS, turn-by-turn.",
    },
    {
      label: "Driver centre",
      value: '14.9", 2880 × 1080',
      note: "Glance mode while moving: 76 px targets, two widgets, no video.",
    },
    {
      label: "Co-pilot",
      value: '14.6", Full HD',
      note: "Privacy shield: a switchable filter and a camera that dims it when the driver looks.",
    },
    {
      label: "Rear, each seat",
      value: '12.8" to 14.6", 2.5K',
      note: "Mini-LED or OLED with local dimming, 1,000 nits, 10-point touch, glove mode.",
    },
    {
      label: "Links",
      value: "GMSL2 / FPD-Link serialisers",
      note: "One video link per display from the head unit.",
    },
  ],
};

export const CONNECTIVITY: SpecGroup = {
  id: "connectivity",
  kicker: "I/O",
  title: "Connectivity and sensing",
  rows: [
    { label: "Cellular", value: "5G (3GPP Rel. 16)", note: "Telematics and streaming." },
    { label: "Wi-Fi", value: "Wi-Fi 6E / 7 hotspot", note: "Phones and laptops in every seat." },
    {
      label: "Bluetooth",
      value: "5.3 with LE Audio",
      note: "Headphones per seat, so each zone can listen alone.",
    },
    { label: "Charging", value: "USB-C PD, 60 W per seat", note: "And a Qi2 pad per row." },
    {
      label: "Microphones",
      value: "4 to 8, beam-formed",
      note: "Echo-cancelled voice per seat: the car knows who is speaking.",
    },
    {
      label: "Cameras",
      value: "Driver monitoring (IR), cabin",
      note: "Glance timing and privacy dimming; the cabin camera records only when asked.",
    },
  ],
};

export const QUALIFICATION: SpecRow[] = [
  { label: "Parts", value: "AEC-Q100 Grade 2" },
  { label: "Functional safety", value: "ISO 26262, ASIL-B (cluster path)" },
  { label: "Cybersecurity", value: "ISO/SAE 21434, UN R155" },
  { label: "Software updates", value: "UN R156" },
  { label: "Operating range", value: "−40 to +85 °C" },
];

export const PLATFORM_SOURCES = [
  {
    title: "Android Automotive 15 release notes",
    url: "https://source.android.com/docs/automotive/start/releases/aaos-24q3",
  },
  {
    title: "CarOccupantZoneManager (Android reference)",
    url: "https://developer.android.com/reference/android/car/CarOccupantZoneManager",
  },
  { title: "Snapdragon SA8295P, 42how", url: "https://en.42how.com/?p=8867" },
  {
    title: "Snapdragon 8295 on 5 nm, CnEVPost",
    url: "https://cnevpost.com/2021/11/29/jidus-first-model-to-feature-qualcomm-snapdragon-8295-chip-based-on-5nm-process",
  },
  {
    title: "Snapdragon Cockpit Elite, Qualcomm",
    url: "https://www.qualcomm.com/automotive/products/elite",
  },
  {
    title: "Cockpit Elite and Ride Elite, Android Central",
    url: "https://www.androidcentral.com/apps-software/qualcomm-announces-snapdragon-cockpit-elite-ride-elite-for-ai-in-cars",
  },
  {
    title: "BMW 7 Series passenger screen, BMWBlog",
    url: "https://www.bmwblog.com/2026/04/24/bmw-7-series-i7-passenger-screen/",
  },
  {
    title: "BMW 7 Series 31.3-inch rear screen, Automotive Interiors World",
    url: "https://automotiveinteriorsworld.com/news/infotainment/latest-bmw-7-series-goes-big-on-passenger-entertainment.html",
  },
  { title: "Waymo in-car features", url: "https://support.google.com/waymo/answer/9172373?hl=en" },
] as const;

/** What production cars and robotaxis already put in front of each seat (the research). */
export const MARKET = [
  {
    who: "Robotaxi rider screens",
    what: "Start ride, trip progress and ETA, climate, music, pull over, call support.",
    source: "Waymo in-car features",
  },
  {
    who: "Passenger screens",
    what: "A co-pilot display for video while moving, hidden from the driver by a filter and a camera.",
    source: "BMW 7 Series",
  },
  {
    who: "Rear theatre screens",
    what: "A 31.3-inch 8K screen for the rear, with touch controls in the doors.",
    source: "BMW 7 Series",
  },
] as const;
