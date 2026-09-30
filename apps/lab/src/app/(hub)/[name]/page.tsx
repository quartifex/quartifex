import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { demos } from "@/demos";
import {
  type CatalogItem,
  getById,
  getCatalog,
  getIconSvg,
  getItem,
  isBuilt,
  KIND_LABEL,
} from "@/lib/catalog";
import styles from "./page.module.css";

type Props = { params: Promise<{ name: string }> };

// Every page is known at build time; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getCatalog().map((item) => ({ name: item.name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getItem((await params).name);
  if (!item) return {};
  return { title: item.name, description: item.description ?? item.category ?? undefined };
}

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
            {item ? <Link href={`/${item.name}`}>{item.name}</Link> : <span>{id}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export default async function ItemPage({ params }: Props) {
  const item = getItem((await params).name);
  if (!item) notFound();
  const built = isBuilt(item);
  const Demo = demos[item.name];

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
            {/* Linked only once the site is actually live. */}
            <dd>{built ? <a href={`https://${item.host}`}>{item.host}</a> : item.host}</dd>
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
