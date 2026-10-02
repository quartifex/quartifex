import type { Metadata, Viewport } from "next";
import { DM_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import "./globals.css";

const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
  title: { default: "Quartifex Lab", template: "%s · Quartifex Lab" },
  description:
    "Open-source libraries, proof sites and small experiments for cinematic, scroll-driven web launches.",
};

// Light by default, dark when the OS asks; a saved choice (below) overrides both on the page.
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#050505" }, { color: "#f4f2ee" }],
  colorScheme: "light dark",
};

// Apply a saved theme before first paint. With no saved choice the tokens follow
// the OS preference on their own, so nothing is set.
const themeScript = `try{var t=localStorage.getItem("qx-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  // The brand faces start downloading with the page, so they are usually in before first
  // paint and the swap from the fallback does not move the layout.
  for (const face of ["ClashDisplay-Variable", "Satoshi-Variable"]) {
    preload(`/fonts/${face}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    <html lang="en" className={dmMono.variable} suppressHydrationWarning>
      <body>
        <Script id="qx-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
