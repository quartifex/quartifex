// Help pages: one topic per page, with the list of topics beside it.
import { notFound } from "next/navigation";
import { COPY } from "./copy";
import { DOCS } from "./docs";
import { SiteFooter, SiteHeader } from "./SiteChrome";

const c = COPY.en;

function Sidebar({ current }: { current?: string }) {
  return (
    <nav className="docs__nav" aria-label={c.docs.topics}>
      <p className="eyebrow">{c.docs.topics}</p>
      <ol>
        {DOCS.map((d) => (
          <li key={d.slug}>
            <a href={`/docs/${d.slug}`} aria-current={d.slug === current ? "page" : undefined}>
              {d.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DocsIndex() {
  return (
    <>
      <SiteHeader locale="en" home="/" />
      <main id="main" className="docs">
        <div className="wrap docs__layout">
          <Sidebar />
          <div className="docs__main">
            <a className="docs__back" href="/">
              ← {c.docs.back}
            </a>
            <h1>{c.docs.title}</h1>
            <p className="lead">{c.docs.lead}</p>
            <ul className="topics topics--all">
              {DOCS.map((d) => (
                <li key={d.slug}>
                  <a href={`/docs/${d.slug}`}>
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
          </div>
        </div>
      </main>
      <SiteFooter locale="en" home="/" />
    </>
  );
}

export function DocTopic({ slug }: { slug: string }) {
  const i = DOCS.findIndex((d) => d.slug === slug);
  const doc = DOCS[i];
  if (!doc) notFound();
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];
  const { Body } = doc;
  return (
    <>
      <SiteHeader locale="en" home="/" />
      <main id="main" className="docs">
        <div className="wrap docs__layout">
          <Sidebar current={slug} />
          <div className="docs__main">
            <a className="docs__back" href="/docs">
              ← {c.docs.title}
            </a>
            <article className="docs__page" id={slug === "privacy" ? "privacy" : undefined}>
              <Body />
            </article>
            <nav className="docs__pager" aria-label={`${c.docs.prev} / ${c.docs.next}`}>
              {prev ? (
                <a href={`/docs/${prev.slug}`} rel="prev">
                  <small>← {c.docs.prev}</small>
                  {prev.label}
                </a>
              ) : (
                <span />
              )}
              {next ? (
                <a href={`/docs/${next.slug}`} rel="next" className="docs__next">
                  <small>{c.docs.next} →</small>
                  {next.label}
                </a>
              ) : null}
            </nav>
          </div>
        </div>
      </main>
      <SiteFooter locale="en" home="/" />
    </>
  );
}

export function docTitle(slug: string): string | undefined {
  return DOCS.find((d) => d.slug === slug)?.label;
}
