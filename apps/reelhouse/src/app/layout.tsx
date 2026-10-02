import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import "./globals.css";

const TITLE = "reelhouse: docs and a live playground for reel and rushes";
const DESCRIPTION =
  "An open-source demo: drop a video, encode it into tiered frames in your browser, play it back with reel and weigh it against a budget. Docs for rushes, reel, heft and viewfinder.";

export const metadata: Metadata = {
  metadataBase: new URL("https://reelhouse.quartifex.com"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://reelhouse.quartifex.com",
    siteName: "Quartifex",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Light by default, dark when the OS asks (the tokens decide the page; this tints the browser).
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#050505" }, { color: "#f4f2ee" }],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The brand faces start downloading with the page, so the swap from the fallback rarely
  // moves the layout.
  for (const face of ["ClashDisplay-Variable", "Satoshi-Variable"]) {
    preload(`/fonts/${face}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
