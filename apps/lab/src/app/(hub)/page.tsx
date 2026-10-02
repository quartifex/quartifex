import Link from "next/link";
import { Hub, type HubGroup } from "@/components/Hub";
import { ItemCard } from "@/components/ItemCard";
import { byKind, isBuilt, KIND_LABEL, KIND_ORDER } from "@/lib/catalog";
import styles from "./page.module.css";

export default function Home() {
  const groups: HubGroup[] = KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    entries: byKind(kind).map((item) => ({
      id: item.id,
      built: isBuilt(item),
      haystack: [item.id, item.name, item.category, item.description, item.label]
        .filter((part) => part !== null)
        .join(" ")
        .toLowerCase(),
      card: <ItemCard item={item} />,
    })),
  }));

  return (
    <>
      <div className={styles.intro}>
        <h1 className={styles.title}>Lab</h1>
        <p className={styles.lede}>
          Everything we are building in the open: libraries for scroll-driven launches, the proof
          sites that use them, and small experiments. Each one is marked built or soon. The
          experiments also have their own gallery: <Link href="/lab">the Lab</Link>.
        </p>
      </div>
      <Hub groups={groups} />
    </>
  );
}
