"use client";

// Hub demo for @quartifex/__NAME__, shown on /__NAME__. Definition of done: live controls,
// a visible reduced-motion state, keyboard reachable, nothing conveyed by motion alone.
import { useState } from "react";

export default function Demo() {
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <div data-demo="__NAME__">
      <label>
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={(event) => setReducedMotion(event.target.checked)}
        />{" "}
        Reduced motion
      </label>
      <p>TODO: the __NAME__ demo and its controls.</p>
    </div>
  );
}
