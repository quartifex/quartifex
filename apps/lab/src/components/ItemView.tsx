import Link from "next/link";
import { type ComponentType, Suspense } from "react";
import { type CatalogItem, getById, getIconSvg, hrefFor, isBuilt, KIND_LABEL } from "@/lib/catalog";
import styles from "./ItemView.module.css";

const REPO = "https://github.com/quartifex/quartifex";

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

/** One catalog item: facts, then its live demo once built. */
export function ItemView({ item, Demo }: { item: CatalogItem; Demo: ComponentType | undefined }) {
  const built = isBuilt(item);

  return (
    <article className={styles.item}>
      <Link href="/" className={styles.back}>
        ← {KIND_LABEL[item.kind]}
      </Link>

      <div className={styles.head}>
        <div
          className={styles.icon}
          aria-hidden="true"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from assets/icons in this repo
          dangerouslySetInnerHTML={{ __html: getIconSvg(item) }}
        />
        <div className={styles.titles}>
          <p className={styles.kicker}>
            {item.id} · {SINGULAR[item.kind]}
          </p>
          <h1 className={styles.title}>{item.name}</h1>
          {(item.description ?? item.category) && (
            <p className={styles.lede}>{item.description ?? item.category}</p>
          )}
          <p className={styles.chips}>
            <span className={styles.chip} data-built={built || undefined}>
              {built ? "Built" : "Soon"}
            </span>
            {item.kind === "lab" && <span className={styles.chip}>Lab</span>}
            {item.label && <span className={styles.chip}>{item.label}</span>}
          </p>
        </div>
      </div>

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
        <section className={styles.use} aria-labelledby="use-title">
          <h2 id="use-title" className={styles.kicker}>
            Use it
          </h2>
          <pre className={styles.install}>
            <code>pnpm add @quartifex/{item.name}</code>
          </pre>
          <p className={styles.note}>
            Not on npm yet: the first release is pending. The quickstart, API table, browser support
            and limitations are in the{" "}
            <a href={`${REPO}/tree/main/packages/${item.name}#readme`}>README</a>.
          </p>
        </section>
      )}

      {built && item.kind === "lab" && (
        <p className={styles.note}>
          A Lab seed: small, finished and open to read, with no API promises. It may change or
          graduate into a library.
        </p>
      )}

      {Demo && (
        <section className={styles.demo} aria-labelledby="demo-title">
          <h2 id="demo-title" className={styles.kicker}>
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
    </article>
  );
}
