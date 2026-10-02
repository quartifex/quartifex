import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import { MOTION_SCRIPT } from "@/lib/motion";
import "./globals.css";

const TITLE = "halcyon: one launch story in full, reduced and static motion";
const DESCRIPTION =
  "An open-source demo: the launch story of a fictional sunrise lamp, told three ways with a live switch between full, reduced and static motion, and the axe and Lighthouse results from CI on the page.";

export const metadata: Metadata = {
  metadataBase: new URL("https://halcyon.quartifex.com"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://halcyon.quartifex.com",
    siteName: "Quartifex",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#050505" }, { color: "#f4f2ee" }],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  for (const face of ["ClashDisplay-Variable", "Satoshi-Variable"]) {
    preload(`/fonts/${face}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    // data-motion is set before first paint by the script below, so React leaves it alone.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* A plain inline script runs while the head is parsed, before anything is painted. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed string from this repo, no input in it */}
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
