// Real YouTube videos for the in-car YouTube and YouTube Music apps, checked against YouTube's
// oEmbed endpoint (18 Oct 2026: title, channel, embeddable). They play in YouTube's own
// embedded player (youtube-nocookie.com); the videos belong to their channels.

export type Video = { id: string; title: string; channel: string; live?: boolean };

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export { thumb };

/** YouTube: drives and the city on the demo route. */
export const VIDEOS: readonly Video[] = [
  {
    id: "XbnZWt7D0-w",
    title: "This Is How Mumbai Looks at Blue Hour | Coastal Road Drive",
    channel: "Wander World Unfold",
  },
  {
    id: "GbVfMuFaKnw",
    title: "Driving on the Mumbai Coastal Freeway, 4K 60fps HDR",
    channel: "Universal Survey",
  },
  {
    id: "gazGMEutrys",
    title: "Bandra Worli Sea Link, New Coastal Road Drive, 4K HDR",
    channel: "Wander World Unfold",
  },
  {
    id: "IYz5UEHXwjQ",
    title: "Marine Drive at Night | 4K Drive in Mumbai, India",
    channel: "City Vibes",
  },
  {
    id: "PB0yfdv8FXI",
    title: "Scenic Mumbai Drive | Coastal Road & Sea Link Views",
    channel: "VJourneys",
  },
  {
    id: "qsduAL6Tbc0",
    title: "Mumbai Feels Different After Dark | Marine Drive Night Walk",
    channel: "Wander World Unfold",
  },
  {
    id: "ni5s08pE3c4",
    title: "15 Dishes in 4 Hours | Mumbai Street Food Tour",
    channel: "Fit Nomads",
  },
  {
    id: "spJqqu2H8n4",
    title: "Driving to the suburbs in heavy rain, for sleep or work",
    channel: "Driving in the Rain",
  },
];

/** YouTube Music: mixes and live radios for the drive. */
export const MIXES: readonly (Video & { mood: string })[] = [
  {
    id: "jfKfPfyJRdk",
    title: "lofi hip hop radio, beats to relax/study to",
    channel: "Lofi Girl",
    live: true,
    mood: "Lo-fi",
  },
  {
    id: "4xDzrJKXOOY",
    title: "synthwave radio, beats to chill/game to",
    channel: "Lofi Girl",
    live: true,
    mood: "Synthwave",
  },
  {
    id: "zW5wpJY1rgQ",
    title: "Night Drive, lofi hip hop mix",
    channel: "Mimi Lofi Chill",
    mood: "Night drive",
  },
  {
    id: "iicfmXFALM8",
    title: "Chill Drive, aesthetic lofi hip hop mix",
    channel: "chilli music",
    mood: "Chill",
  },
  {
    id: "TlWYgGyNnJo",
    title: "1 A.M Chill Session [synthwave]",
    channel: "Lofi Girl",
    mood: "Synthwave",
  },
  {
    id: "lNfJTTYgejk",
    title: "Car music mix: EDM, bounce, electro house",
    channel: "Infinity Bass",
    mood: "EDM",
  },
];

export const VIDEO_BY_ID: Record<string, Video> = Object.fromEntries(
  [...VIDEOS, ...MIXES].map((v) => [v.id, v]),
);

export const embed = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
