import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { type CatalogItem, getIconSvg, githubLinks, hrefFor, isBuilt } from "@/lib/catalog";
import styles from "./ItemCard.module.css";
import { FavoriteButton } from "./shell/FavoriteButton";

/**
 * One catalog item. The icon is inlined so its own animation and hover palette work. The
 * name's link covers the whole card; the source link sits above it, so the two never nest.
 */
export function ItemCard({ item }: { item: CatalogItem }) {
  const built = isBuilt(item);
  const github = githubLinks(item);
  return (
    <article className={`${styles.card} qxi-host`} data-testid="item-card">
      <div
        className={styles.icon}
        aria-hidden="true"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from assets/icons in this repo
        dangerouslySetInnerHTML={{ __html: getIconSvg(item) }}
      />
      <div className={styles.meta}>
        <span>{item.id}</span>
        <Badge tone={built ? "accent" : "outline"}>{built ? "Built" : "Soon"}</Badge>
      </div>
      <div className={styles.fav}>
        <FavoriteButton itemId={item.id} name={item.name} />
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
