"use client";

// Hub demo for @quartifex/understudy, shown on /understudy. Definition of done: live controls,
// a visible reduced-motion state, keyboard reachable, nothing conveyed by motion alone.
import { useState } from "react";

export default function Demo() {
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <div data-demo="understudy">
      <label>
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={(event) => setReducedMotion(event.target.checked)}
        />{" "}
        Reduced motion
      </label>
      <p>TODO: the understudy demo and its controls.</p>
    </div>
  );
}
