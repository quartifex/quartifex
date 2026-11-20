import type { Metadata, Viewport } from "next";
import { NadiPiece } from "./NadiPiece";

export const metadata: Metadata = {
  title: "Nadī",
  description: "Rain on new land: watch it cut valleys, canyons and deltas.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function Page() {
  return <NadiPiece />;
}
