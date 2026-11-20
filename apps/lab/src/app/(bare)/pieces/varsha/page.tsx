import type { Metadata, Viewport } from "next";
import { VarshaPiece } from "./VarshaPiece";

export const metadata: Metadata = {
  title: "Varsha",
  description: "A year of the monsoon over South Asia, from thirty years of real wind and rain.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function Page() {
  return <VarshaPiece />;
}
