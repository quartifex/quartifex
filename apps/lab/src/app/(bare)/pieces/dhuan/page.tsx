import type { Metadata, Viewport } from "next";
import { DhuanPiece } from "./DhuanPiece";

export const metadata: Metadata = {
  title: "Dhuān",
  description: "Smoke and ink in a glass box, as a real 3D fluid you can stir.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function Page() {
  return <DhuanPiece />;
}
