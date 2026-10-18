// The documentation, in the page: a sticky sub-navigation of hash links beside the sections,
// each written in MDX (content/docs) so it can be edited without touching components. It reads
// in the paper (light) theme.

import { ByQuartifex } from "@/components/Quartifex";
import Overview from "../../content/docs/01-overview.mdx";
import Architecture from "../../content/docs/02-architecture.mdx";
import Modules from "../../content/docs/03-modules.mdx";
import DesignSystem from "../../content/docs/04-design-system.mdx";
import Interaction from "../../content/docs/05-interaction.mdx";
import Safety from "../../content/docs/06-safety.mdx";
import Accessibility from "../../content/docs/07-accessibility.mdx";
import Integration from "../../content/docs/08-integration.mdx";
import Changelog from "../../content/docs/09-changelog.mdx";
import { DocsNav } from "./DocsNav";
import s from "./docs.module.css";

export const DOCS = [
  {
    id: "docs-overview",
    label: "Overview and principles",
    summary: "What AVENUE is, who it serves, and the principles every screen follows.",
    Body: Overview,
  },
  {
    id: "docs-architecture",
    label: "Architecture",
    summary: "One system, four zones: shared state, seat modes and the driving rules.",
    Body: Architecture,
  },
  {
    id: "docs-modules",
    label: "Module reference",
    summary: "Every app on the screens, its states, and how it behaves for the driver.",
    Body: Modules,
  },
  {
    id: "docs-design-system",
    label: "Design system",
    summary: "Colour, type, spacing and motion tokens, live from the code, and the components.",
    Body: DesignSystem,
  },
  {
    id: "docs-interaction",
    label: "Interaction and motion",
    summary: "Touch targets, feedback, and how things move on a screen in a moving car.",
    Body: Interaction,
  },
  {
    id: "docs-safety",
    label: "Safety and distraction",
    summary: "Glance limits, the parked and moving lockout, and what the driver can never do.",
    Body: Safety,
  },
  {
    id: "docs-accessibility",
    label: "Accessibility",
    summary: "Contrast, text size, captions and keyboard access on every seat.",
    Body: Accessibility,
  },
  {
    id: "docs-integration",
    label: "Integration notes",
    summary: "What bringing AVENUE into a vehicle involves: platform, signals and hardware.",
    Body: Integration,
  },
  {
    id: "docs-changelog",
    label: "Changelog",
    summary: "What changed, and when.",
    Body: Changelog,
  },
] as const;

export function Docs() {
  return (
    <section id="docs" data-snap className={s.docs} data-theme="paper" aria-labelledby="docs-title">
      <div className={`wrap ${s.layout}`}>
        <header className={s.header}>
          <p className="eyebrow">DOC · Documentation</p>
          <h2 id="docs-title" className="h1">
            The system, written down.
          </h2>
          <p className="lede">
            Architecture, modules, the design system, the interaction and safety rules, and what
            integration involves. Pick a chapter; each one links on its own.
          </p>
          <ByQuartifex content="docs" tone="paper" />
        </header>
        <DocsNav items={DOCS.map(({ id, label, summary }) => ({ id, label, summary }))}>
          {DOCS.map(({ id, Body }) => (
            <Body key={id} />
          ))}
        </DocsNav>
      </div>
    </section>
  );
}
