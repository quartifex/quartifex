import Link from "next/link";
import { type ComponentType, Suspense } from "react";
import {
  type CatalogItem,
  getById,
  getIconSvg,
  githubLinks,
  hrefFor,
  isBuilt,
  KIND_LABEL,
  taglineFor,
} from "@/lib/catalog";
import styles from "./ItemView.module.css";

const SINGULAR: Record<CatalogItem["kind"], string> = {
  lib: "Library",
  site: "Proof site",
  lab: "Lab seed",
};

function Related({ ids }: { ids: string[] }) {
  return (
    <ul className={styles.related}>
      {ids.map((id) => {
        const item = getById(id);
        return (
          <li key={id}>
            {item ? <Link href={hrefFor(item)}>{item.name}</Link> : <span>{id}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One catalog item. The page leads with what the item does: a compact identity strip (with
 * its source on GitHub), then the demo, above the fold. The facts come after.
 */
export function ItemView({ item, Demo }: { item: CatalogItem; Demo: ComponentType | undefined }) {
  const built = isBuilt(item);
  const github = githubLinks(item);
  const tagline = taglineFor(item);

  return (
    <article className={styles.item}>
      <header className={styles.identity}>
        <div
          className={styles.icon}
          aria-hidden="true"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from assets/icons in this repo
          dangerouslySetInnerHTML={{ __html: getIconSvg(item) }}
        />
        <div className={styles.titles}>
          <p className={styles.kicker}>
            <Link href={item.kind === "lab" ? "/lab" : "/"} className={styles.back}>
              {KIND_LABEL[item.kind]}
            </Link>{" "}
            / {item.id} · {SINGULAR[item.kind]}
            {item.category ? ` · ${item.category}` : ""}
          </p>
          <h1 className={styles.title}>{item.name}</h1>
          {tagline && <p className={styles.lede}>{tagline}</p>}
        </div>
        <div className={styles.aside}>
          <p className={styles.chips}>
            <span className={styles.chip} data-built={built || undefined}>
              {built ? "Built" : "Soon"}
            </span>
            {item.label && <span className={styles.chip}>{item.label}</span>}
          </p>
          {github && (
            <p className={styles.links}>
              <a href={github.source} data-testid="item-source">
                Source on GitHub
              </a>
              {github.readme && (
                <a href={github.readme} data-testid="item-readme">
                  README
                </a>
              )}
            </p>
          )}
        </div>
      </header>

      {Demo && (
        <section className={styles.demo} aria-labelledby="demo-title" data-testid="item-demo">
          <h2 id="demo-title" className="visually-hidden">
            Demo
          </h2>
          <Suspense fallback={<p className={styles.note}>Loading the demo.</p>}>
            <Demo />
          </Suspense>
        </section>
      )}

      {!built && (
        <p className={styles.note}>
          Not built yet. The demo, quickstart and API reference appear here when it is.
        </p>
      )}

      <section className={styles.about} aria-labelledby="about-title">
        <h2 id="about-title" className={styles.kicker}>
          About {item.name}
        </h2>
        <dl className={styles.facts}>
          {item.category && (
            <div>
              <dt>Category</dt>
              <dd>{item.category}</dd>
            </div>
          )}
          <div>
            <dt>Status</dt>
            <dd>{item.state}</dd>
          </div>
          <div>
            <dt>Build order</dt>
            <dd>
              {item.order} · gate {item.prompt}
            </dd>
          </div>
          {item.effort && (
            <div>
              <dt>Effort</dt>
              <dd>{item.effort}</dd>
            </div>
          )}
          {item.host && (
            <div>
              <dt>Address</dt>
              {/* Linked only once the site is deployed (catalog "live": true), not merely built. */}
              <dd>
                {item.live ? (
                  <a href={`https://${item.host}`}>{item.host}</a>
                ) : (
                  <>
                    {item.host}
                    {built ? " (built, not deployed yet)" : ""}
                  </>
                )}
              </dd>
            </div>
          )}
          {item.deps.length > 0 && (
            <div>
              <dt>Depends on</dt>
              <dd>
                <Related ids={item.deps} />
              </dd>
            </div>
          )}
          {item.libs.length > 0 && (
            <div>
              <dt>Built with</dt>
              <dd>
                <Related ids={item.libs} />
              </dd>
            </div>
          )}
        </dl>

        {built && item.kind === "lib" && (
          <div className={styles.use}>
            <h3 className={styles.kicker}>Use it</h3>
            <pre className={styles.install}>
              <code>pnpm add @quartifex/{item.name}</code>
            </pre>
            <p className={styles.note}>
              Not on npm yet: the first release is pending. The quickstart, API table, browser
              support and limitations are in the{" "}
              {github?.readme ? <a href={github.readme}>README</a> : "README"}.
            </p>
          </div>
        )}

        {built && item.kind === "lab" && (
          <p className={styles.note}>
            A Lab seed: small, finished and open to read, with no API promises. It may change or
            graduate into a library.
          </p>
        )}
      </section>
    </article>
  );
}
