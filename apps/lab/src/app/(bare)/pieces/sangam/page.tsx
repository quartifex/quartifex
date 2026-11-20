import type { Metadata, Viewport } from "next";
import { SangamPiece } from "./SangamPiece";

export const metadata: Metadata = {
  title: "Sangam",
  description: "Two galaxies meet, and a million stars are flung into tails, bridges and shells.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function Page() {
  return <SangamPiece />;
}
