# GSAP licence check

A record of what GSAP's licence says, for libraries here that use GSAP as an **optional
peer dependency**. This is a summary of the published text, not legal advice. Re-read the
source before the first publish and before any release that changes how we use GSAP.

| | |
| --- | --- |
| Source | https://gsap.com/community/standard-license/ |
| Document | Standard "No Charge" GSAP License |
| Licensor | Webflow |
| Effective date (as published) | 30 April 2025 |
| Last modified (as published) | 30 May 2025 |
| Fetched and read | 30 September 2026 |

## What the text says

**Grant.** A non-exclusive, worldwide licence to use, reproduce, display and implement
GSAP Products, solely for Permitted Uses. "GSAP Products" covers the core library and the
related plugins, tools and extensions made available at gsap.com.

**Permitted Uses.** Implementing or using GSAP Products on any website, web application
or digital interface, by any person or entity. The text notes this includes companies that
compete with Webflow in other areas.

**Prohibited Uses.** Using GSAP Products in tools that let users build visual animations
without code, where that encourages or materially assists a solution competing with
Webflow's visual animation building capabilities.

**Restrictions.** Without prior written consent, you may not use GSAP Products for a
Prohibited Use; reverse engineer them to create Competitive Products (software that lets
users create, edit or manage animations through a visual interface or builder similar to
Webflow); or remove or alter proprietary notices or branding.

**Ownership.** All intellectual property in GSAP Products stays with Webflow. The licence
transfers no ownership.

**Termination.** Webflow may terminate the licence at its discretion on non-compliance;
on termination all use must stop and copies be destroyed.

**Amendments.** Webflow may revise the licence by posting new terms. Continued use of
later releases means acceptance. If you do not accept a revision you may not use versions
released after its effective date, but may keep using earlier versions under the terms
that applied to them.

**Relationship to other terms.** The licence is incorporated into Webflow's Terms of
Service (https://webflow.com/legal/terms); where they conflict, the GSAP licence governs
for GSAP Products.

**FAQ on the same page** (informative, not the licence body): commercial use at no charge
is covered by the standard licence, including the plugins that were formerly members-only
(SplitText and MorphSVG are named). For a tool that exposes GSAP-driven effects through a
visual interface, the page says to contact them if unsure whether it is a Prohibited Use.

## Facts relevant to how this repo uses GSAP

- The GSAP licence is **not** an OSI open-source licence and is not MIT. Our packages are
  MIT; GSAP itself keeps its own licence wherever it is used.
- Our packages declare `gsap` under `peerDependencies` with
  `peerDependenciesMeta.gsap.optional: true`. They do not bundle, vendor or redistribute
  GSAP's source: the person installing a package installs GSAP themselves, and accepts
  GSAP's licence themselves.
- The grant covers using and implementing GSAP on websites and web applications. Proof
  sites and the Lab hub that load GSAP fall under "website, web application, or digital
  interface" as the text defines Permitted Uses.
- The licence text does not mention peer dependencies, wrappers or third-party libraries
  that call GSAP. It neither names that case as permitted nor lists it under Prohibited
  Uses. The stated prohibition is specific to no-code visual animation builders that
  compete with Webflow.

## Items to watch

- **Playground or builder-style tools.** Anything in the catalog that lets a visitor
  assemble animation through a visual interface (for example a docs playground, or
  `storyboard`) should be checked against the Prohibited Uses wording before it ships, and
  GSAP asked if it is unclear.
- **Notices.** Never strip or alter GSAP's notices or branding in any file that includes it.
- **READMEs.** Each package that can use GSAP should say that GSAP is optional, is
  installed separately, and carries its own licence, with a link to the source above.
- **Drift.** The licence can change by posting. Record the "last modified" date again at
  each check; if it differs from the one above, re-read the full text.

## Open questions for Nitesh

- Whether to ask GSAP directly to confirm that open-source libraries with GSAP as an
  optional peer dependency are fine, before the first publish. The text does not address
  it either way.
