import type { Metadata, Viewport } from "next";
import { ShaharPiece } from "./ShaharPiece";

export const metadata: Metadata = {
  title: "Shahar",
  description: "A real city in the real sun: watch the shadows swing round on any day of the year.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function Page() {
  return <ShaharPiece />;
}
