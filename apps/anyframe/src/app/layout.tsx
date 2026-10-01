import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
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

export const viewport: Viewport = { themeColor: "#050505", colorScheme: "dark light" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
