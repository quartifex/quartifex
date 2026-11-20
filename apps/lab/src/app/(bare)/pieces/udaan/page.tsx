import type { Metadata, Viewport } from "next";
import { UdaanPiece } from "./UdaanPiece";

export const metadata: Metadata = {
  title: "Udaan",
  description:
    "A day of the world's flights, from the morning rush to the red-eyes, over the turning Earth.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function Page() {
  return <UdaanPiece />;
}
