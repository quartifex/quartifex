import type { Metadata, Viewport } from "next";
import { SandhyaPiece } from "./SandhyaPiece";

export const metadata: Metadata = {
  title: "Sandhyā",
  description: "Dusk at sea, and a quarter of a million starlings turning over it.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function Page() {
  return <SandhyaPiece />;
}
