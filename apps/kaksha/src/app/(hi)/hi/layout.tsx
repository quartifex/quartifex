import type { ReactNode } from "react";
import { siteMetadata, siteViewport } from "../../../site/meta";
import { SiteLayout } from "../../../site/SiteLayout";

export const metadata = siteMetadata();
export const viewport = siteViewport;

export default function Layout({ children }: { children: ReactNode }) {
  return <SiteLayout lang="en">{children}</SiteLayout>;
}
