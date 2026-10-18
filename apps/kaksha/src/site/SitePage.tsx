// The one-page site: product page, live demo and documentation. Built as the
// stationery of a classroom: a register card, a marks slip, exercise-book covers,
// a notebook, an inland letter.
import { existsSync } from "node:fs";
import path from "node:path";
import { CASE_STUDY_URL, PRODUCT_NAME, PRODUCT_NAME_HI, REPO_URL, STUDIO_URL } from "../config";
import { ContactForm } from "./ContactForm";
import { COPY, type SiteLocale } from "./copy";
import { Demo } from "./Demo";
import { DOCS } from "./docs";
import { Install } from "./Install";
import { PaperToGrid } from "./PaperToGrid";

/** Playwright captures these from the demo (scripts/shots.mjs). Raster is never committed. */
function installShots(locale: SiteLocale): string[] {
  const names = ["home", "mark", "results"].map((n) => `/shots/${locale}-${n}.webp`);
  return names.filter((n) => existsSync(path.join(process.cwd(), "public", n)));
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    // biome-ignore lint/performance/noImgElement: static SVG marks, drawn at their own size
    <img
      src={dark ? "/brand/logo-dark.svg" : "/brand/logo.svg"}
      width={163}
      height={35}
      alt={`${PRODUCT_NAME} (${PRODUCT_NAME_HI})`}
      className="logo"
    />
  );
}

const why = {
  offline: (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <rect x="34" y="14" width="52" height="92" rx="10" fill="currentColor" />
      <rect x="40" y="24" width="40" height="66" rx="4" fill="var(--sheet)" />
      <path
        d="M46 58l9 9 19-21"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 24l80 80" stroke="var(--sheet)" strokeWidth="14" strokeLinecap="round" />
      <path d="M20 24l80 80" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),
  device: (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <rect x="30" y="52" width="60" height="50" rx="10" fill="currentColor" />
      <path d="M42 52V38a18 18 0 0136 0v14" fill="none" stroke="currentColor" strokeWidth="9" />
      <circle cx="60" cy="74" r="7" fill="var(--sheet)" />
      <rect x="57" y="76" width="6" height="14" rx="3" fill="var(--sheet)" />
    </svg>
  ),
  open: (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M60 32c-12-8-30-10-44-6v68c14-4 32-2 44 6 12-8 30-10 44-6V26c-14-4-32-2-44 6z"
        fill="currentColor"
      />
      <path d="M60 32v68" stroke="var(--sheet)" strokeWidth="5" />
      <path
        d="M26 46h22M26 58h22M26 70h16M72 46h22M72 58h22M72 70h16"
        stroke="var(--sheet)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export function SitePage({ locale }: { locale: SiteLocale }) {
  const c = COPY[locale];
  const shots = installShots(locale);
  const appHref = locale === "hi" ? "/app?lang=hi" : "/app?lang=en";
  return (
    <>
      <a className="skip" href="#main">
        {c.skip}
      </a>
      <header className="top">
        <a href={locale === "hi" ? "/hi" : "/"} className="top__brand">
          <Logo dark />
        </a>
        <nav aria-label={PRODUCT_NAME} className="top__nav">
          <a href="#demo">{c.nav.demo}</a>
          <a href="#why">{c.nav.why}</a>
          <a href="#install">{c.nav.install}</a>
          <a href="#docs">{c.nav.docs}</a>
          <a href="#schools">{c.nav.schools}</a>
        </nav>
        <a
          className="top__lang"
          href={c.langOther.href}
          hrefLang={c.langOther.lang}
          lang={c.langOther.lang}
        >
          {c.langOther.label}
        </a>
      </header>

      <main id="main">
        {/* 1. The register card. */}
        <section className="hero" aria-labelledby="hero-h">
          <div className="register">
            <div className="register__holes" aria-hidden="true" />
            <div className="register__head">
              <p className="register__kicker">{c.hero.kicker}</p>
              <p className="label" data-testid="honest-label">
                {c.label}
              </p>
            </div>
            <h1 id="hero-h" className="register__title">
              {c.hero.title}
            </h1>
            <p className="register__lines">
              {c.hero.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </p>
            <div className="register__actions">
              <a className="cta" href={appHref}>
                {c.hero.open}
              </a>
              <a className="cta cta--ghost" href="#demo">
                {c.hero.demo}
              </a>
            </div>
            <dl className="register__facts">
              {c.hero.facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="register__sub">{c.hero.sub}</p>
            {/* biome-ignore lint/performance/noImgElement: static SVG marks, drawn at their own size */}
            <img className="register__stamp" src="/brand/mark.svg" width={72} height={72} alt="" />
          </div>
        </section>

        {/* 2. Paper to grid to chart. */}
        <section className="sheet" aria-labelledby="sheet-h">
          <h2 id="sheet-h" className="section-title">
            {c.sheet.title}
          </h2>
          <PaperToGrid copy={c.sheet} locale={locale} />
        </section>

        {/* 3. The live demo. */}
        <section id="demo" className="band band--ink" aria-labelledby="demo-h">
          <div className="band__inner">
            <h2 id="demo-h" className="section-title">
              {c.demo.title}
            </h2>
            <p className="lead">{c.demo.body}</p>
            <Demo copy={c.demo} locale={locale} />
          </div>
        </section>

        {/* 4. Why: three exercise-book covers stacking up. */}
        <section id="why" className="why" aria-labelledby="why-h">
          <h2 id="why-h" className="section-title">
            {c.why.title}
          </h2>
          <ol className="why__stack">
            {c.why.items.map((item, i) => (
              <li key={item.id} className={`why__sheet why__sheet--${i}`}>
                <h3>{item.title}</h3>
                <div className="why__body">
                  <p>{item.body}</p>
                  <a href={item.id === "open" ? REPO_URL : item.link}>{item.linkText} →</a>
                </div>
                <div className="why__art">{why[item.id as keyof typeof why]}</div>
              </li>
            ))}
          </ol>
        </section>

        {/* 5. Install: a marks slip. */}
        <section id="install" className="band band--ink" aria-labelledby="install-h">
          <div className="band__inner install-grid">
            <div>
              <h2 id="install-h" className="section-title">
                {c.install.title}
              </h2>
              <p className="lead">{c.install.body}</p>
            </div>
            <Install copy={c.install} shots={shots} />
          </div>
        </section>

        {/* 6. Documentation: a notebook with index tabs. */}
        <section id="docs" className="docs" aria-labelledby="docs-h">
          <div className="docs__head">
            <h2 id="docs-h" className="section-title">
              {c.docs.title}
            </h2>
            <p className="lead">{c.docs.lead}</p>
            {c.docs.hiNote ? <p className="docs__note">{c.docs.hiNote}</p> : null}
          </div>
          <div className="docs__book">
            <nav className="docs__nav" aria-label={c.docs.onThisPage}>
              <p>{c.docs.onThisPage}</p>
              <ol>
                {DOCS.map((d) => (
                  <li key={d.id}>
                    <a href={`#${d.id}`}>{d.label}</a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="docs__pages" lang="en">
              {DOCS.map(({ id, Body }) => (
                <article key={id} id={id} className="docs__page">
                  <Body />
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 7. For schools and NGOs: an inland letter. */}
        <section id="schools" className="schools" aria-labelledby="schools-h">
          <div className="inland">
            <div className="inland__head">
              <h2 id="schools-h" className="section-title">
                {c.schools.title}
              </h2>
              <span className="inland__stamp" aria-hidden="true">
                {/* biome-ignore lint/performance/noImgElement: static SVG marks, drawn at their own size */}
                <img src="/brand/mark.svg" width={56} height={56} alt="" />
              </span>
            </div>
            <p className="lead">{c.schools.body}</p>
            <ContactForm copy={c.schools} locale={locale} />
          </div>
        </section>

        {/* 8. Origin: a short letter. */}
        <section className="origin" aria-labelledby="origin-h">
          <div className="letter">
            <h2 id="origin-h" className="section-title">
              {c.origin.title}
            </h2>
            {c.origin.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="letter__sign">{c.origin.sign}</p>
            {CASE_STUDY_URL ? <a href={CASE_STUDY_URL}>{c.origin.caseStudy} →</a> : null}
          </div>
        </section>
      </main>

      {/* 9. The back of the card. */}
      <footer className="foot">
        <div className="foot__card">
          <div className="foot__left">
            <Logo />
            <p className="foot__label">{c.label}</p>
            <p>{c.footer.note}</p>
          </div>
          <ul className="foot__links">
            <li>
              <a href={STUDIO_URL}>{c.footer.made}</a>
            </li>
            <li>
              <a href="#privacy">{c.footer.privacy}</a>
            </li>
            <li>
              <a href={REPO_URL}>{c.footer.source}</a>
            </li>
            <li>{c.footer.licence}</li>
          </ul>
          <p className="foot__fonts">{c.footer.fonts}</p>
        </div>
      </footer>
    </>
  );
}
