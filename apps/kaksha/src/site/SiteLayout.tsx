import { Analytics } from "@vercel/analytics/next";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import "./site.css";

// Cookieless Vercel Web Analytics on the product page only. The app at /app has none.
export function SiteLayout({ lang, children }: { lang: "en" | "hi"; children: ReactNode }) {
  const font = { as: "font", type: "font/woff2", crossOrigin: "" } as const;
  preload("/fonts/barlow-condensed-latin-700-normal.woff2", font);
  preload("/fonts/inter-latin-400-normal.woff2", font);
  if (lang === "hi") preload("/fonts/mukta-devanagari-700-normal.woff2", font);
  return (
    <html lang={lang}>
      <body>
        {children}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
