import type { Metadata } from "next";
import { PRODUCT_NAME } from "../../../config";
import { DocsIndex } from "../../../site/DocsPage";

export const metadata: Metadata = {
  title: `Help · ${PRODUCT_NAME}`,
  description: `How to use ${PRODUCT_NAME}: getting started, tests, marking, results, report cards, backups, privacy.`,
  alternates: { canonical: "/docs" },
};

export default function Docs() {
  return <DocsIndex />;
}
