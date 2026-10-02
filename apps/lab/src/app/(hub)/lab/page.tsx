import type { Metadata } from "next";
import { LabGallery } from "@/components/LabGallery";
import { getIconSvg } from "@/lib/catalog";
import { seedEntries } from "@/lib/seeds";

export const metadata: Metadata = {
  title: "Lab",
  description: "Small, finished experiments: a gallery of the Quartifex Lab seeds.",
};

// The Lab seeds as a gallery. "New" is read from git when the page is built.
export default function LabPage() {
  return <LabGallery entries={seedEntries(getIconSvg)} />;
}
