"use client";

import { useEffect } from "react";

let started = false;

/**
 * Plays the logo preloader once per visit (sessionStorage), on the first load only.
 * The server renders `#pl-cover` so there is no flash of page before it starts; the boot script
 * hides the cover for repeat visits. `?nopre` skips it. Reduced motion gets a calm still version.
 */
export function Preloader() {
  useEffect(() => {
    const cover = document.getElementById("pl-cover");
    if (started) return;
    started = true;
    let first = true;
    try {
      first = !sessionStorage.getItem("qx-pl");
      sessionStorage.setItem("qx-pl", "1");
    } catch {
      // storage blocked: treat every load as a first visit
    }
    // Hide, never remove: React owns this node and must still find it on later updates.
    const hideCover = () => {
      if (cover) cover.style.display = "none";
    };
    if (!first || /[?&#]nopre/.test(location.href)) {
      hideCover();
      return;
    }
    import("@/lib/logo/preloader").then(({ playPreloader }) => {
      playPreloader(document.body, { fixed: true, real: true });
      hideCover();
    });
  }, []);

  return null;
}
