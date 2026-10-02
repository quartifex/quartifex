import Link from "next/link";
import { type CatalogItem, getIconSvg, githubLinks, hrefFor, isBuilt } from "@/lib/catalog";
import styles from "./ItemCard.module.css";

/**
 * One catalog item. The icon is inlined so its own animation and hover palette work. The
 * name's link covers the whole card; the source link sits above it, so the two never nest.
 */
export function ItemCard({ item }: { item: CatalogItem }) {
  const built = isBuilt(item);
  const github = githubLinks(item);
  return (
    <article className={styles.card} data-testid="item-card">
      <div
        className={styles.icon}
        aria-hidden="true"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from assets/icons in this repo
        dangerouslySetInnerHTML={{ __html: getIconSvg(item) }}
      />
      <div className={styles.meta}>
        <span>{item.id}</span>
        <span className={styles.chip} data-built={built || undefined}>
          {built ? "Built" : "Soon"}
        </span>
      </div>
      <h3 className={styles.name}>
        <Link href={hrefFor(item)} className={styles.link}>
          {item.name}
        </Link>
      </h3>
      <p className={styles.note}>{item.description ?? item.category}</p>
      {github && (
        <a
          href={github.source}
          className={styles.source}
          aria-label={`Source code for ${item.name} on GitHub`}
          data-testid="card-source"
        >
          Source ↗
        </a>
      )}
    </article>
  );
}
