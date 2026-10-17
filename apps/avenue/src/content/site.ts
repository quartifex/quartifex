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
      "“mersedes cls63” by DZST ALG STREET on Sketchfab, CC BY 4.0. Used for demonstration only: maker emblems, badges and plate removed, textures retouched, rescaled and compressed by Quartifex. AVENUE is not affiliated with any carmaker.",
  },
  {
    item: "Night road",
    credit: "“Rural Asphalt Road” by Poly Haven, CC0; graded day-for-night by Quartifex.",
  },
  {
    item: "Reflections",
    credit: "“Qwantani Moonrise” by Poly Haven, CC0.",
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
