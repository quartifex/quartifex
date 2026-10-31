// The demo on its own: one AVENUE screen filling the page, with no car, no story and no chrome.
// quartifex.com puts it on the screen of a 3D tablet in the AVENUE case study. `?seat=` picks the
// seat (rear left by default, the lounge screen a tablet stands in for).
import type { Metadata, Viewport } from "next";
import { TabletDemo } from "@/demo/TabletDemo";

export const metadata: Metadata = {
  title: "AVENUE, the live demo",
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0e131d",
  colorScheme: "dark",
};

export default function Tablet() {
  return <TabletDemo />;
}
