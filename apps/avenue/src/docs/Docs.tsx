// The documentation, in the page: a sticky sub-navigation of hash links beside the sections,
// each written in MDX (content/docs) so it can be edited without touching components. It reads
// in the paper (light) theme.

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
  { id: "docs-overview", label: "Overview and principles", Body: Overview },
  { id: "docs-architecture", label: "Architecture", Body: Architecture },
  { id: "docs-modules", label: "Module reference", Body: Modules },
  { id: "docs-design-system", label: "Design system", Body: DesignSystem },
  { id: "docs-interaction", label: "Interaction and motion", Body: Interaction },
  { id: "docs-safety", label: "Safety and distraction", Body: Safety },
  { id: "docs-accessibility", label: "Accessibility", Body: Accessibility },
  { id: "docs-integration", label: "Integration notes", Body: Integration },
  { id: "docs-changelog", label: "Changelog", Body: Changelog },
] as const;

export function Docs() {
  return (
    <section id="docs" className={s.docs} data-theme="paper" aria-labelledby="docs-title">
      <div className={`wrap ${s.layout}`}>
        <header className={s.header}>
          <p className="eyebrow">Documentation</p>
          <h2 id="docs-title" className="h1">
            The system, written down.
          </h2>
          <p className="lede">
            Architecture, modules, the design system, the interaction and safety rules, and what
            integration involves. One page, linkable by section.
          </p>
        </header>
        <DocsNav items={DOCS.map(({ id, label }) => ({ id, label }))} />
        <div className={s.content}>
          {DOCS.map(({ id, Body }) => (
            <article key={id} id={id} className={s.article}>
              <Body />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
