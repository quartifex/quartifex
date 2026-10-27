import type { Metadata, Viewport } from "next";
import { DM_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import { BOOT_SCRIPT } from "@/lib/boot";
import "./globals.css";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Quartifex Lab", template: "%s · Quartifex Lab" },
  description:
    "Open-source libraries, proof sites and small experiments for cinematic, scroll-driven web launches.",
};

// Dark on a first visit; the boot script (below) applies a saved choice before first paint.
export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The brand faces start downloading with the page, so they are usually in before first
  // paint and the swap from the fallback does not move the layout.
  for (const face of ["ClashDisplay-Variable", "Satoshi-Variable"]) {
    preload(`/fonts/${face}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    <html
      lang="en"
      data-theme="dark"
      data-surface="depth"
      data-brand="lab"
      className={dmMono.variable}
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static boot script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
