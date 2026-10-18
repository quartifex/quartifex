// One icon set for the interface: 24 px grid, 1.5 px stroke (matching regular text), round
// joins, drawn with currentColor so every state comes from CSS. Outline by default; `filled`
// marks an active state where a shape has an obvious solid form.
import type { SVGProps } from "react";

const P = {
  home: "M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z",
  media:
    "M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM10 9.2v5.6L14.8 12Z",
  journey:
    "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Zm0-8.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z",
  climate: "M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5",
  routines: "M12 7v5l3 2M21 12a9 9 0 1 1-2.6-6.4M21 4v4h-4",
  clips: "M4 7h16v12H4zM4 7l2-3h12l2 3M9 11v4l4-2Z",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4.9a7.4 7.4 0 0 0-1.7-1L15 3.4h-4l-.4 2.5a7.4 7.4 0 0 0-1.7 1L6.6 6l-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-.9a7.4 7.4 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 1.7-1l2.4.9 2-3.4Z",
  play: "M8 5.5v13l10.5-6.5Z",
  pause: "M8 5v14M16 5v14",
  next: "M6 6l8 6-8 6ZM17 6v12",
  prev: "M18 6l-8 6 8 6ZM7 6v12",
  share: "M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6",
  sos: "M12 3.5 21 19.5H3Z M12 10v4M12 16.8v.2",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9h-13z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21",
  wifi: "M3.5 9.5a12 12 0 0 1 17 0M6.5 12.5a7.8 7.8 0 0 1 11 0M9.5 15.5a3.6 3.6 0 0 1 5 0M12 18.5v.1",
  bluetooth: "M7 7l10 10-5 4V3l5 4L7 17",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  check: "M5 12.5 10 17.5 19 7",
  record: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  stop: "M7 7h10v10H7z",
  sound: "M4 9.5h4L13 5v14l-5-4.5H4ZM16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11",
  mute: "M4 9.5h4L13 5v14l-5-4.5H4ZM17 9.5l5 5M22 9.5l-5 5",
  car: "M5 16.5V12l2-5h10l2 5v4.5M5 16.5h14M5 16.5v2M19 16.5v2M7.5 13.5h.1M16.5 13.5h.1",
  seat: "M8 4h5l-1 9H7ZM6 13h9a2 2 0 0 1 2 2v2H6ZM8 17v3M15 17v3",
  light: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z",
  fan: "M12 12c0-4 1.5-7.5 4-7.5s2.5 4-4 7.5Zm0 0c4 0 7.5 1.5 7.5 4s-4 2.5-7.5-4Zm0 0c0 4-1.5 7.5-4 7.5s-2.5-4 4-7.5Zm0 0c-4 0-7.5-1.5-7.5-4s4-2.5 7.5 4Z",
  ar: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M12 8l4 2.3v4.4L12 17l-4-2.3v-4.4Z",
  map: "M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6ZM9 4v14M15 6v14",
  turn: "M7 20v-7a4 4 0 0 1 4-4h7M15 5.5 18.5 9 15 12.5",
  coffee:
    "M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5ZM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2M11 3.5v2M14 3.5v2",
  bolt: "M13 3 5 13.5h6L10 21l8-10.5h-6Z",
  bread: "M5 11a4 4 0 0 1 4-5h6a4 4 0 0 1 4 5v8H5Z",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  shield: "M12 3 5 6v5.5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6Z",
  text: "M4 7V5h11v2M9.5 5v14M14 12v-1.5h7V12M17.5 10.5V19",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  inbox: "M4 13.5 6.5 5h11l2.5 8.5V19H4ZM4 13.5h5l1 2h4l1-2h5",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  pull: "M6 20V11a4 4 0 0 1 4-4h8M15 4l3 3-3 3M3.5 20h17",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .9-1 1.6v.4M12 16.8v.2",
  heat: "M8 4c-1.4 1.8 1.4 3.2 0 5s1.4 3.2 0 5M12 4c-1.4 1.8 1.4 3.2 0 5s1.4 3.2 0 5M16 4c-1.4 1.8 1.4 3.2 0 5s1.4 3.2 0 5M5 19.5h14",
  radio: "M4 9h16v11H4zM7 9l9-5M8 14.5h3M15.5 16.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  eyeOff:
    "M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.7 0 3.2-.5 4.4-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2",
  phone:
    "M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z",
  speed: "M4.5 17a8.5 8.5 0 1 1 15 0M12 13.5l4-4M12 15a1.5 1.5 0 1 0 0-3",
  pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Zm0-8.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15ZM10 20.5a2.2 2.2 0 0 0 4 0",
  apps: "M5 5h3v3H5zM10.5 5h3v3h-3zM16 5h3v3h-3zM5 10.5h3v3H5zM10.5 10.5h3v3h-3zM16 10.5h3v3h-3zM5 16h3v3H5zM10.5 16h3v3h-3zM16 16h3v3h-3z",
  youtube:
    "M3 8.5c0-2 1.2-3.2 3.2-3.4C8 5 10 5 12 5s4 0 5.8.1C19.8 5.3 21 6.5 21 8.5v7c0 2-1.2 3.2-3.2 3.4-1.8.1-3.8.1-5.8.1s-4 0-5.8-.1C4.2 18.7 3 17.5 3 15.5ZM10 9v6l5-3Z",
  ytmusic:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM10.8 10v4l3.2-2Z",
  store: "M5 8h14l-1 12H6ZM9 8V6.5a3 3 0 0 1 6 0V8M10 12.5v3.5l3.2-1.75Z",
  cast: "M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6M3 13a6 6 0 0 1 6 6M3 16.5A2.5 2.5 0 0 1 5.5 19M3 19.5h.1",
  power: "M12 3v8M6.8 6.5a7.5 7.5 0 1 0 10.4 0",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2",
  image: "M4 5h16v14H4zM4 16l4.5-4.5 4 4 2.5-2.5L20 18M15.5 9.5h.1",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  palette:
    "M12 3a9 9 0 0 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3ZM7.5 12h.1M9.5 8h.1M14.5 8h.1",
  dnd: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM7.5 12h9",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14",
  back: "M15 5l-7 7 7 7",
} as const;

export type IconName = keyof typeof P;

export function Icon({
  name,
  size = 24,
  filled = false,
  ...rest
}: { name: IconName; size?: number | string; filled?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={P[name]} />
    </svg>
  );
}
