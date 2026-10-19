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

/** The docs, in reading order. Each one is its own page at /docs/<slug>. */
export const DOCS = [
  {
    slug: "getting-started",
    label: "Getting started",
    desc: "Open, install, add a class",
    Body: GettingStarted,
  },
  { slug: "roster", label: "Importing a roster", desc: "CSV, paste, or type names", Body: Roster },
  {
    slug: "tests",
    label: "Making a test or rubric",
    desc: "Answer keys, rubrics, examples",
    Body: Tests,
  },
  {
    slug: "marking",
    label: "The marking screen",
    desc: "By question, by student, undo",
    Body: Entry,
  },
  {
    slug: "results",
    label: "Reading results",
    desc: "Averages, questions, skills, groups",
    Body: Views,
  },
  {
    slug: "reports",
    label: "Report cards and export",
    desc: "PDF, class summary, spreadsheet",
    Body: Reports,
  },
  {
    slug: "backup",
    label: "Backup and new phones",
    desc: "Locked files, restore, combine",
    Body: Backup,
  },
  {
    slug: "templates",
    label: "Templates (JSON schema)",
    desc: "Share tests and rubrics as files",
    Body: Templates,
  },
  { slug: "data-model", label: "The data model", desc: "What is stored, and how", Body: DataModel },
  { slug: "privacy", label: "Privacy", desc: "In plain words, with sources", Body: Privacy },
  {
    slug: "accessibility",
    label: "Accessibility",
    desc: "Sunlight, text size, screen readers",
    Body: Accessibility,
  },
  { slug: "languages", label: "Adding a language", desc: "For translators", Body: Languages },
  { slug: "faq", label: "Questions", desc: "Short answers", Body: Faq },
  { slug: "changelog", label: "Changelog", desc: "What changed", Body: Changelog },
] as const;

export type DocSlug = (typeof DOCS)[number]["slug"];
