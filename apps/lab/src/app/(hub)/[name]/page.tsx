import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItemView } from "@/components/ItemView";
import { demos } from "@/demos";
import { getCatalog, getItem } from "@/lib/catalog";

type Props = { params: Promise<{ name: string }> };

// Every page is known at build time; anything else is a 404. Lab seeds live at /lab/<name>.
export const dynamicParams = false;

export function generateStaticParams() {
  return getCatalog()
    .filter((item) => item.kind !== "lab")
    .map((item) => ({ name: item.name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getItem((await params).name);
  if (!item || item.kind === "lab") return {};
  return { title: item.name, description: item.description ?? item.category ?? undefined };
}

export default async function ItemPage({ params }: Props) {
  const item = getItem((await params).name);
  if (!item || item.kind === "lab") notFound();
  return <ItemView item={item} Demo={demos[item.name]} />;
}
