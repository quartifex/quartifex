import type { Metadata } from "next";
import { PRODUCT_NAME } from "../../../../config";
import { DocTopic, docTitle } from "../../../../site/DocsPage";
import { DOCS } from "../../../../site/docs";

export const dynamicParams = false;

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${docTitle(slug) ?? "Help"} · ${PRODUCT_NAME}`,
    alternates: { canonical: `/docs/${slug}` },
  };
}

export default async function Topic({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DocTopic slug={slug} />;
}
