import type { Metadata, Viewport } from "next";
import { BrahmandPiece } from "./BrahmandPiece";

export const metadata: Metadata = {
  title: "Brahmānd",
  description:
    "Every photograph is a universe if you step to one side of it. Give it a photo, let it go, and move through what it becomes.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function Page() {
  return <BrahmandPiece />;
}
