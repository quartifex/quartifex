// Facts about the page that are not design tokens: its label, what is still to be supplied
// (as [[NEEDED: ...]] placeholders, rendered as "to be confirmed" on the page), and the
// provenance of every asset. Nothing here is invented: where a fact is missing, it says so.

export const SITE = {
  name: "AVENUE",
  url: "https://avenue.quartifex.com",
  studio: { name: "Quartifex", url: "https://quartifex.com" },
  honesty: "AVENUE is a concept system by Quartifex, available for collaboration.",
  label: "Personal Concept",
  year: "[[NEEDED: project year]]",
  projectLabel: "[[NEEDED: self-initiated concept, or with a client or carmaker?]]",
  contact: "[[NEEDED: partner inbox]]",
} as const;

/** A [[NEEDED: ...]] placeholder: something only Nitesh can supply. */
export const NEEDED = /\[\[NEEDED: ([^\]]+)\]\]/;

export function isNeeded(value: string): boolean {
  return NEEDED.test(value);
}

/** Provenance of everything on the page that is not text or code. */
export const CREDITS: ReadonlyArray<{ item: string; credit: string }> = [
  {
    item: "Car model",
    credit:
      "“BMW X6M Competition Assetto” by vecarz on Sketchfab, CC BY 4.0. Used for demonstration only: every maker's badge, roundel and lettering removed, tyre lettering and plates replaced, screens blanked, simplified and compressed by Quartifex. AVENUE is not affiliated with any carmaker.",
  },
  {
    item: "Sky",
    credit:
      "“Kloofendal 48d Partly Cloudy (Pure Sky)” by Poly Haven, CC0; reduced for reflections.",
  },
  {
    item: "Maps",
    credit:
      "Navigation views use a Google Maps capture of Mumbai (Map data ©2026 Google), shown as a concept illustration; the route is drawn by AVENUE. The AR view uses a Google Street View image of the Coastal Road (Street View image ©2026 Google), with AVENUE's overlay drawn on top.",
  },
  {
    item: "YouTube and YouTube Music",
    credit:
      "Real videos and mixes, played in YouTube's own embedded player (youtube-nocookie.com). They belong to their channels, named beside each one; AVENUE is not affiliated with YouTube.",
  },
  {
    item: "Play Store apps",
    credit:
      "Parkwise, PlugMap, Tidepool, Storytime, Word Quest and Skyglass are sample apps invented for the demo.",
  },
  {
    item: "Cabin screens",
    credit:
      "Drawn live in the browser from the demo's state; the AVENUE screens are added to the model in code.",
  },
  {
    item: "Interface sounds",
    credit: "Synthesised in the browser with the Web Audio API; off by default. No sound files.",
  },
  {
    item: "Music",
    credit:
      "AVENUE Radio (EDM and lo-fi) is generated live in the browser with the Web Audio API: no recordings, no samples, no licensed tracks.",
  },
  {
    item: "Type",
    credit:
      "Archivo and Archivo Narrow (Omnibus-Type) and DM Mono (Colophon), SIL Open Font License 1.1, self-hosted.",
  },
  {
    item: "Sample content in the demo",
    credit: "Titles, places, news and people in the demo are invented for illustration.",
  },
];

export const CAR_NOTICE =
  "Vehicle model used for demonstration only. AVENUE is not affiliated with any carmaker.";

export const SOURCES = {
  nhtsa: {
    title:
      "Visual-Manual NHTSA Driver Distraction Guidelines for In-Vehicle Electronic Devices (78 FR 24817, 26 April 2013, docket NHTSA-2010-0053)",
    url: "https://www.federalregister.gov/d/2013-09883",
  },
};
