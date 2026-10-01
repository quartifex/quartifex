import type { Metadata } from "next";
import { Suspense } from "react";
import { SamplePage } from "./SamplePage";

export const metadata: Metadata = {
  title: "Test page",
  description: "A tall test page for heft, light or deliberately heavy.",
  robots: { index: false },
};

// A tall test page for performance checks. ?heavy=1 adds a late layout shift, 60 ms of
// work on every scroll event and a 250 ms click handler, on purpose.
export default function Page() {
  return (
    <Suspense>
      <SamplePage />
    </Suspense>
  );
}
