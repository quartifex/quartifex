import type { Metadata, Viewport } from "next";
import { SyahiPiece } from "./SyahiPiece";

export const metadata: Metadata = {
  title: "Syāhi",
  description: "Ink in still water. Click to let a drop fall. Stir it, and you can't take it back.",
};

export const viewport: Viewport = { themeColor: "#ebe6da", colorScheme: "light" };

export default function Page() {
  return <SyahiPiece />;
}
