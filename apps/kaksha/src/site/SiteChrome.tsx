// The header and footer shared by the product page and the help pages.
import { PRODUCT_NAME, PRODUCT_NAME_HI, REPO_URL, STUDIO_URL } from "../config";
import { COPY, type SiteLocale } from "./copy";

export function Logo({ dark = false }: { dark?: boolean }) {
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

/** `home` is "" on the product page itself, so section links stay in-page. */
export function SiteHeader({ locale, home = "" }: { locale: SiteLocale; home?: string }) {
  const c = COPY[locale];
  const appHref = "/app";
  const links: Array<[string, string]> = [
    [`${home}#demo`, c.nav.demo],
    [`${home}#why`, c.nav.why],
    [`${home}#install`, c.nav.install],
    ["/docs", c.nav.help],
    [`${home}#schools`, c.nav.schools],
  ];
  return (
    <>
      <a className="skip" href="#main">
        {c.skip}
      </a>
      <header className="top">
        <div className="top__inner">
          <a href="/" className="top__brand">
            <Logo />
          </a>
          <nav aria-label={PRODUCT_NAME} className="top__nav">
            {links.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>

          <a className="cta cta--sm" href={appHref}>
            {c.nav.open}
          </a>
          <details className="top__menu">
            <summary aria-label={c.nav.menu}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </summary>
            <nav aria-label={c.nav.menu}>
              {links.map(([href, label]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
              <a href={appHref}>{c.nav.open}</a>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}

export function SiteFooter({ locale, home = "" }: { locale: SiteLocale; home?: string }) {
  const c = COPY[locale];
  const f = c.footer;
  const appHref = "/app";
  return (
    <footer className="foot">
      <div className="foot__inner">
        <div className="foot__brand">
          <Logo dark />
          <span className="tag">{c.label}</span>
          <p>{f.note}</p>
        </div>
        <div className="foot__cols">
          <div>
            <p className="eyebrow">{f.product}</p>
            <ul>
              <li>
                <a href={appHref}>{f.open}</a>
              </li>
              <li>
                <a href={`${home}#demo`}>{f.demo}</a>
              </li>
              <li>
                <a href={`${home}#install`}>{f.install}</a>
              </li>
              <li>
                <a href="/docs">{f.help}</a>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">{f.about}</p>
            <ul>
              <li>
                <a href={STUDIO_URL}>{f.made}</a>
              </li>
              <li>
                <a href="/docs/privacy">{f.privacy}</a>
              </li>
              <li>
                <a href={REPO_URL}>{f.source}</a>
              </li>
              <li>
                <a href={`${home}#schools`}>{f.schools}</a>
              </li>
            </ul>
          </div>
        </div>
        <p className="foot__fonts">{f.fonts}</p>
      </div>
    </footer>
  );
}
