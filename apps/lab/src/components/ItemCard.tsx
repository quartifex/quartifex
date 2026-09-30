import Link from "next/link";
import { type CatalogItem, getIconSvg, isBuilt } from "@/lib/catalog";
import styles from "./ItemCard.module.css";

/** One catalog item. The icon is inlined so its own animation and hover palette work. */
export function ItemCard({ item }: { item: CatalogItem }) {
  const built = isBuilt(item);
  return (
    <Link href={`/${item.name}`} className={styles.card} data-testid="item-card">
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
      <h3 className={styles.name}>{item.name}</h3>
      <p className={styles.note}>{item.description ?? item.category}</p>
    </Link>
  );
}
