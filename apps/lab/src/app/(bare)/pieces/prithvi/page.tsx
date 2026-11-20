import type { Metadata, Viewport } from "next";
import { PrithviPiece } from "./PrithviPiece";

export const metadata: Metadata = {
  title: "Prithvi",
  description:
    "The Earth with a sea level you can move: back to the last ice age, or forward to a world with the ice gone.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function Page() {
  return <PrithviPiece />;
}
