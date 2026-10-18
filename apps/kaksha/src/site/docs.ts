import GettingStarted from "../../content/docs/01-getting-started.mdx";
import Roster from "../../content/docs/02-roster.mdx";
import Tests from "../../content/docs/03-tests.mdx";
import Entry from "../../content/docs/04-entry.mdx";
import Views from "../../content/docs/05-views.mdx";
import Reports from "../../content/docs/06-reports.mdx";
import Backup from "../../content/docs/07-backup.mdx";
import Templates from "../../content/docs/08-templates.mdx";
import DataModel from "../../content/docs/09-data-model.mdx";
import Privacy from "../../content/docs/10-privacy.mdx";
import Accessibility from "../../content/docs/11-accessibility.mdx";
import Languages from "../../content/docs/12-languages.mdx";
import Faq from "../../content/docs/13-faq.mdx";
import Changelog from "../../content/docs/14-changelog.mdx";

/** The docs, in reading order. `id` is the anchor; privacy keeps the short #privacy. */
export const DOCS = [
  { id: "docs-getting-started", label: "Getting started", Body: GettingStarted },
  { id: "docs-roster", label: "Importing a roster", Body: Roster },
  { id: "docs-tests", label: "Making a test or rubric", Body: Tests },
  { id: "docs-entry", label: "The entry screen", Body: Entry },
  { id: "docs-views", label: "Class and student views", Body: Views },
  { id: "docs-reports", label: "Reports and export", Body: Reports },
  { id: "docs-backup", label: "Backup and new phones", Body: Backup },
  { id: "docs-templates", label: "Templates (JSON schema)", Body: Templates },
  { id: "docs-data-model", label: "The data model", Body: DataModel },
  { id: "privacy", label: "Privacy", Body: Privacy },
  { id: "docs-accessibility", label: "Accessibility", Body: Accessibility },
  { id: "docs-languages", label: "Adding a language", Body: Languages },
  { id: "docs-faq", label: "Questions", Body: Faq },
  { id: "docs-changelog", label: "Changelog", Body: Changelog },
];
