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
    item: "3D car",
    credit:
      "Original concept car modelled in code for this page by Quartifex (src/three/shape.ts); no third-party model, no real marque.",
  },
  {
    item: "Lighting and reflections",
    credit:
      "Studio environment built in code at run time (light strips rendered into an environment map); no downloaded HDRI.",
  },
  {
    item: "Textures",
    credit: "None downloaded: screen contents are drawn live in the browser from the demo's state.",
  },
  {
    item: "Interface sounds",
    credit: "Synthesised in the browser with the Web Audio API; off by default. No sound files.",
  },
  {
    item: "Image-sequence fallback and poster",
    credit: "Drawn in code from the same car geometry and encoded at build time.",
  },
  {
    item: "Type",
    credit:
      "Archivo (Omnibus-Type), Instrument Sans (Instrument) and DM Mono (Colophon), all SIL Open Font License 1.1, self-hosted.",
  },
  {
    item: "Sample content in the demo",
    credit: "Titles, places, news and people in the demo are invented for illustration.",
  },
];

export const SOURCES = {
  nhtsa: {
    title:
      "Visual-Manual NHTSA Driver Distraction Guidelines for In-Vehicle Electronic Devices (78 FR 24817, 26 April 2013, docket NHTSA-2010-0053)",
    url: "https://www.federalregister.gov/d/2013-09883",
  },
};
