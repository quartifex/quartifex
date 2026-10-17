// The A/B test survey (ratings out of 5) from the AVENUE case study, exactly as recorded on
// the showcase board. It covered the rear-seat system only.
//
// "Physical effort" is unresolved: the board gives a net difference of -1.15, but 2.25 - 3 is
// -0.75. Until Nitesh confirms which is right, the page shows the two ratings and no net
// difference for that row. The participant count and method are not stated until supplied.

export type Metric = {
  name: string;
  v1: number;
  v2: number;
  /** Net difference as recorded, or null where it is unresolved. */
  net: number | null;
  /** For effort, lower is better. */
  lowerIsBetter: boolean;
  note?: string;
};

export const AB_METRICS: readonly Metric[] = [
  { name: "Overall experience", v1: 3, v2: 4.4, net: 1.4, lowerIsBetter: false },
  { name: "Functionality", v1: 2.9, v2: 4.25, net: 1.35, lowerIsBetter: false },
  { name: "Workflow flexibility", v1: 3.15, v2: 4.15, net: 1, lowerIsBetter: false },
  { name: "Information hierarchy", v1: 3.15, v2: 3.9, net: 0.75, lowerIsBetter: false },
  { name: "Clarity and control", v1: 3, v2: 4.15, net: 1.15, lowerIsBetter: false },
  { name: "Mental effort", v1: 3.25, v2: 2.15, net: -1.1, lowerIsBetter: true },
  {
    name: "Physical effort",
    v1: 3,
    v2: 2.25,
    net: null,
    lowerIsBetter: true,
    note: "Net difference withheld: the recorded figure (-1.15) does not match the ratings (2.25 - 3 = -0.75). [[NEEDED: confirm the physical-effort figure]]",
  },
];

/** What is known about the test, and what is still to be supplied. */
export const AB_CONTEXT = {
  scope: "Rear-seat system only",
  scale: "Survey ratings out of 5, after A/B testing two versions of the interface",
  participants: "[[NEEDED: participant count]]",
  method: "[[NEEDED: how the A/B test was run]]",
};
