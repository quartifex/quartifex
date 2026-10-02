import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import "./globals.css";

const TITLE = "anyframe: one scene, every screen";
const DESCRIPTION =
  "An open-source demo: the same scroll scene staged for every screen from a tall phone to 32:9, with safe frames, resolution decisions and a device-matrix contact sheet. Concept visual, drawn in code.";

export const metadata: Metadata = {
  metadataBase: new URL("https://anyframe.quartifex.com"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://anyframe.quartifex.com",
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
  // The brand faces start downloading with the page, so they are usually in before first
  // paint and the swap from the fallback does not move the layout.
  for (const face of ["ClashDisplay-Variable", "Satoshi-Variable"]) {
    preload(`/fonts/${face}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
