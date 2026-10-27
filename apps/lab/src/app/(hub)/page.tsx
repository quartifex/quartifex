import { Hub, type HubGroup } from "@/components/Hub";
import { ItemCard } from "@/components/ItemCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { byKind, getIconSvg, isBuilt, KIND_LABEL, KIND_ORDER } from "@/lib/catalog";
import styles from "./page.module.css";

type SearchParams = Promise<{ kind?: string; q?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const { kind = "all", q = "" } = await searchParams;
  const groups: HubGroup[] = KIND_ORDER.map((k) => ({
    kind: k,
    label: KIND_LABEL[k],
    entries: byKind(k).map((item) => ({
      id: item.id,
      built: isBuilt(item),
      haystack: [item.id, item.name, item.category, item.description, item.label]
        .filter((part) => part !== null)
        .join(" ")
        .toLowerCase(),
      card: <ItemCard item={item} />,
    })),
  }));

  const mosaic = byKind("lib").filter(isBuilt).slice(0, 9);

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <Badge tone="lab" live>
            Quartifex Lab · open source
          </Badge>
          <h1 id="hero-title" className={styles.title}>
            Cinematic launch kit, built in the open.
          </h1>
          <p className={styles.lede}>
            Libraries for scroll-driven launches, the proof sites that use them, and small
            experiments. Browse freely; sign in to save what you like and raise a ticket.
          </p>
          <div className={styles.cta}>
            <Button href="#catalog" cta>
              Browse the catalog
            </Button>
            <Button href="/lab" variant="soft">
              Open the Lab
            </Button>
          </div>
        </div>
        <ul className={styles.mosaic} aria-hidden="true">
          {mosaic.map((item) => (
            <li
              key={item.id}
              className="qxi-host"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG from assets/icons in this repo
              dangerouslySetInnerHTML={{ __html: getIconSvg(item) }}
            />
          ))}
        </ul>
      </section>
      <div id="catalog">
        <Hub key={`${kind}|${q}`} groups={groups} initialKind={kind} initialQuery={q} />
      </div>
    </>
  );
}
