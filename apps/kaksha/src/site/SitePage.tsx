// The product page: what it is, a live demo, why it is built this way, how to install
// it, help, and a word for schools. The help itself lives on its own pages (/docs).
import { readFileSync } from "node:fs";
import path from "node:path";
import { CASE_STUDY_URL, REPO_URL } from "../config";
import { ContactForm } from "./ContactForm";
import { COPY, type SiteLocale } from "./copy";
import { Demo } from "./Demo";
import { DOCS } from "./docs";
import { Install } from "./Install";
import { PaperToGrid } from "./PaperToGrid";
import { MockMark, MockToday, MockWelcome, Phone } from "./PhoneMocks";
import { SiteFooter, SiteHeader } from "./SiteChrome";

/** The app's real first-visit size, written by scripts/build-app.mjs. */
function appKb(): string {
  try {
    const file = path.join(process.cwd(), "public", "app", "build.json");
    const b = JSON.parse(readFileSync(file, "utf8")) as { initialJsGzipKb?: number };
    return String(Math.round(b.initialJsGzipKb ?? 0) || "");
  } catch {
    return "";
  }
}

const icons: Record<string, string> = {
  device: "M6 11h12v10H6zM8 11V7a4 4 0 018 0v4",
  offline: "M3 3l18 18M8.5 16.5a5 5 0 017 0M5 12.5a10 10 0 015-2.6M14 10a10 10 0 015 2.5M12 20h.01",
  open: "M12 6c-2-1.4-5-2-8-1.5v13c3-.5 6 .1 8 1.5 2-1.4 5-2 8-1.5v-13c-3-.5-6 .1-8 1.5zM12 6v13",
  "getting-started": "M5 21V4M5 4h11l-2 4 2 4H5",
  tests: "M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h5",
  marking: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  results: "M4 20h16M7 16v-5M12 16V6M17 16v-8",
  reports:
    "M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-5a2 2 0 012-2h12a2 2 0 012 2v5a1 1 0 01-1 1h-2M7 14h10v6H7z",
  backup: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z",
};

function Glyph({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="glyph">
      <path
        d={icons[name] ?? icons.tests}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SitePage({ locale }: { locale: SiteLocale }) {
  const c = COPY[locale];
  const appHref = "/app";
  const kb = appKb();
  const topics = c.help.topics
    .map((slug) => DOCS.find((d) => d.slug === slug))
    .filter((d): d is (typeof DOCS)[number] => Boolean(d));

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main">
        {/* 1. Hero */}
        <section className="hero" aria-labelledby="hero-h">
          <div className="hero__inner">
            <div className="hero__copy">
              <p className="tag" data-testid="honest-label">
                {c.hero.eyebrow}
              </p>
              <h1 id="hero-h">{c.hero.title}</h1>
              <p className="hero__sub">{c.hero.sub}</p>
              <div className="hero__actions">
                <a className="cta" href={appHref}>
                  {c.hero.open}
                </a>
                <a className="cta cta--ghost" href="#demo">
                  {c.hero.demo}
                </a>
              </div>
              <dl className="ledger">
                {c.hero.facts.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="hero__phones" role="img" aria-label={c.hero.phones}>
              <Phone className="pm--back">
                <MockMark m={c.mock} />
              </Phone>
              <Phone className="pm--front">
                <MockToday m={c.mock} />
              </Phone>
              {/* biome-ignore lint/performance/noImgElement: the brand mark, a small static SVG */}
              <img className="hero__stamp" src="/brand/mark.svg" width={84} height={84} alt="" />
            </div>
          </div>
        </section>

        {/* 2. Paper to grid to chart */}
        <section className="sheet" aria-labelledby="sheet-h">
          <div className="wrap">
            <div className="split-head">
              <div>
                <p className="eyebrow">{c.sheet.eyebrow}</p>
                <h2 id="sheet-h" className="section-title">
                  {c.sheet.title}
                </h2>
              </div>
              <p className="split-head__desc">{c.sheet.desc}</p>
            </div>
            <PaperToGrid copy={c.sheet} locale={locale} />
          </div>
        </section>

        {/* 3. The live demo */}
        <section id="demo" className="band band--ink" aria-labelledby="demo-h">
          <div className="wrap">
            <Demo copy={c.demo} locale={locale} />
          </div>
        </section>

        {/* 4. Why */}
        <section id="why" className="why" aria-labelledby="why-h">
          <div className="wrap">
            <div className="split-head">
              <div>
                <p className="eyebrow">{c.why.eyebrow}</p>
                <h2 id="why-h" className="section-title">
                  {c.why.title}
                </h2>
              </div>
              <p className="split-head__desc">{c.why.desc}</p>
            </div>
            <ul className="why__cards">
              {c.why.items.map((item) => (
                <li key={item.id} className="why__card">
                  <span className="why__icon">
                    <Glyph name={item.id} />
                  </span>
                  <p className="why__num">{item.num.replace("{kb}", kb || "~120")}</p>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <a href={item.id === "open" ? REPO_URL : item.link}>{item.linkText} →</a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5. Install */}
        <section id="install" className="band band--paper" aria-labelledby="install-h">
          <div className="wrap">
            <Install
              copy={c.install}
              phones={
                <>
                  <Phone className="pm--sm">
                    <MockWelcome m={c.mock} />
                  </Phone>
                  <Phone className="pm--sm pm--raised">
                    <MockToday m={c.mock} />
                  </Phone>
                  <Phone className="pm--sm">
                    <MockMark m={c.mock} />
                  </Phone>
                </>
              }
            />
          </div>
        </section>

        {/* 6. Help */}
        <section id="docs" className="help" aria-labelledby="help-h">
          <div className="wrap">
            <div className="split-head">
              <div>
                <p className="eyebrow">{c.help.eyebrow}</p>
                <h2 id="help-h" className="section-title">
                  {c.help.title}
                </h2>
              </div>
              <p className="split-head__desc">{c.help.desc}</p>
            </div>
            <ul className="topics">
              {topics.map((d) => (
                <li key={d.slug}>
                  <a href={`/docs/${d.slug}`} lang="en">
                    <Glyph name={d.slug} />
                    <span>
                      <strong>{d.label}</strong>
                      <small>{d.desc}</small>
                    </span>
                    <span className="topics__chev" aria-hidden="true">
                      ›
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="faq">
              {c.help.faq.map(([q, a], i) => (
                <details key={q} open={i === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
            <a className="more-link" href="/docs">
              {c.help.all} →
            </a>
          </div>
        </section>

        {/* 7. For schools and NGOs */}
        <section id="schools" className="band band--ink" aria-labelledby="schools-h">
          <div className="wrap schools">
            <div className="schools__text">
              <p className="eyebrow">{c.schools.eyebrow}</p>
              <h2 id="schools-h" className="section-title">
                {c.schools.title}
              </h2>
              <p className="lead">{c.schools.body}</p>
              <ul className="offers">
                {c.schools.offers.map(([t, d]) => (
                  <li key={t}>
                    <strong>{t}</strong>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ContactForm copy={c.schools} locale={locale} />
          </div>
        </section>

        {/* 8. Origin */}
        <section className="origin" aria-labelledby="origin-h">
          <div className="wrap origin__inner">
            {/* biome-ignore lint/performance/noImgElement: the brand mark, a small static SVG */}
            <img src="/brand/mark.svg" width={88} height={88} alt="" className="origin__mark" />
            <div>
              <p className="eyebrow">{c.origin.eyebrow}</p>
              <h2 id="origin-h" className="origin__title">
                {c.origin.title}
              </h2>
              <p>{c.origin.body}</p>
              <p className="origin__sign">{c.origin.sign}</p>
              {CASE_STUDY_URL ? <a href={CASE_STUDY_URL}>{c.origin.caseStudy} →</a> : null}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
