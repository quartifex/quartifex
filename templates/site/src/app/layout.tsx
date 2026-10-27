import type { Metadata } from "next";
import { DM_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
  title: "__NAME__",
  description: "TODO: one honest sentence. __LABEL__.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={dmMono.variable}>
      <body>{children}</body>
    </html>
  );
}
