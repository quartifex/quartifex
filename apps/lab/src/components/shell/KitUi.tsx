"use client";

import { useEffect } from "react";
import { THEME_KEY } from "@/lib/boot";
import type { CueName } from "@/lib/kit-ui";
import { installXsite } from "@/lib/xsite";

declare global {
  // set once the sound engine is ready; other client islands play cues through it
  var __qxSfx: ((name: CueName) => void) | undefined;
}

/**
 * Starts the sound engine, the settings panel and the custom cursor once the page is mounted,
 * and renders the two elements the cursor draws into. Sound and music are on by default; the
 * browser only lets audio start after the first tap or key press.
 */
export function KitUi() {
  useEffect(() => {
    let alive = true;
    const offXsite = installXsite();
    import("@/lib/kit-ui").then(({ initKitUi }) => {
      if (!alive) return;
      const ui = initKitUi();
      if (ui) globalThis.__qxSfx = (name) => ui.sfx(name);
    });
    // the settings panel flips data-theme; keep the visitor's choice for next time
    const root = document.documentElement;
    const remember = new MutationObserver(() => {
      try {
        localStorage.setItem(THEME_KEY, root.dataset.theme === "dark" ? "dark" : "light");
      } catch {
        // storage blocked, the choice just won't persist
      }
    });
    remember.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      alive = false;
      offXsite();
      remember.disconnect();
    };
  }, []);

  // Keep the cursor above everything, dialogs included: dialogs opened with showModal() live in the
  // browser's top layer, which no z-index can beat, so the cursor joins it and is re-raised whenever
  // a dialog opens.
  useEffect(() => {
    const layers = ["cur", "curtip"].map((id) => document.getElementById(id));
    const lift = () => {
      for (const el of layers) {
        if (!el?.showPopover) continue;
        try {
          if (el.matches(":popover-open")) el.hidePopover();
          el.showPopover();
        } catch {
          // popovers unsupported: the max z-index in kit.css still covers ordinary overlays
        }
      }
    };
    lift();
    const watch = new MutationObserver(lift);
    watch.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    return () => watch.disconnect();
  }, []);
  return (
    <>
      <div id="cur" aria-hidden="true" popover="manual">
        <div className="rip" id="curRip" />
        <div id="curIn" />
      </div>
      <div id="curtip" aria-hidden="true" popover="manual">
        <div className="tip" id="curTipText" />
      </div>
    </>
  );
}
