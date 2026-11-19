import type { Metadata, Viewport } from "next";
import { NadaPiece } from "./NadaPiece";

export const metadata: Metadata = {
  title: "Nāda",
  description:
    "A quarter of a million grains of sand on a plate. Move, and the note changes. Click, and it turns over. Hold still, and the sand finds where the silence is.",
};

export const viewport: Viewport = { themeColor: "#060708", colorScheme: "dark" };

export default function Page() {
  return <NadaPiece />;
}
