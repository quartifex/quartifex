import type { Metadata } from "next";
import { Suspense } from "react";
import { ScenePage } from "./ScenePage";

export const metadata: Metadata = {
  title: "Test scene",
  description:
    "The code-built test scenes (jar, watch), full screen, for demos and contact sheets.",
  robots: { index: false },
};

// The bare test scene: no hub chrome, so it can fill an iframe or a Playwright viewport.
// Query: ?mode=safeframe|center&prop=jar|watch&t=0..1&dpr=n
export default function Page() {
  return (
    <Suspense>
      <ScenePage />
    </Suspense>
  );
}
