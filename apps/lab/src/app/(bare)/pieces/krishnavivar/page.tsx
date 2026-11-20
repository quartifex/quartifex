import type { Metadata, Viewport } from "next";
import { KrishnavivarPiece } from "./KrishnavivarPiece";

export const metadata: Metadata = {
  title: "Kṛṣṇavivar",
  description: "A black hole, ray-traced: its disk, its shadow, and the sky bent round it.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function Page() {
  return <KrishnavivarPiece />;
}
