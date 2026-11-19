import type { Metadata, Viewport } from "next";
import { NiyamPiece } from "./NiyamPiece";

export const metadata: Metadata = {
  title: "Niyam",
  description:
    "Three short equations. Every thread obeys them exactly, and no two ever take the same path. Drag to turn it. Click for another law.",
};

export const viewport: Viewport = { themeColor: "#050607", colorScheme: "dark" };

export default function Page() {
  return <NiyamPiece />;
}
