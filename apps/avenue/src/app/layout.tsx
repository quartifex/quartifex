import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SITE } from "@/content/site";
import { tokensCss } from "@/design/tokens";
import { display, mono, narrow } from "./fonts";
import "./globals.css";

const TITLE = "AVENUE: every seat gets a first-class screen";
const DESCRIPTION =
  "AVENUE is an infotainment concept for the whole car: driver, co-pilot and rear seats as one connected system. Play the demo in a 3D cabin, read the design system, and partner with us to build it.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "AVENUE",
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE.url,
    siteName: "AVENUE by Quartifex",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#06070a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${narrow.variable} ${mono.variable}`}
      data-motion="full"
    >
      <head>
        {/* The design tokens, from the one tokens file the docs also render. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: generated from our own tokens file, no input in it */}
        <style dangerouslySetInnerHTML={{ __html: tokensCss() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
