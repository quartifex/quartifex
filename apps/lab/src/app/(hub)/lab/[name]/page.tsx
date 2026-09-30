import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItemView } from "@/components/ItemView";
import { byKind, getItem } from "@/lib/catalog";
import { seeds } from "@/seeds";

type Props = { params: Promise<{ name: string }> };

// Lab seeds: small, finished experiments with no API promises.
export const dynamicParams = false;

export function generateStaticParams() {
  return byKind("lab").map((item) => ({ name: item.name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getItem((await params).name);
  if (item?.kind !== "lab") return {};
  return { title: `${item.name} (Lab)`, description: item.description ?? undefined };
}

export default async function LabSeedPage({ params }: Props) {
  const item = getItem((await params).name);
  if (item?.kind !== "lab") notFound();
  return <ItemView item={item} Demo={seeds[item.name]} />;
}
