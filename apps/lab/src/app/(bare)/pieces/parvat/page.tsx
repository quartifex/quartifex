import type { Metadata, Viewport } from "next";
import { ParvatPiece } from "./ParvatPiece";

export const metadata: Metadata = {
  title: "Parvat",
  description:
    "A mountain range that does not exist, drawn from millions of points. Steer with the pointer. Click to send light across it. It never ends.",
};

export const viewport: Viewport = { themeColor: "#05070a", colorScheme: "dark" };

export default function Page() {
  return <ParvatPiece />;
}
