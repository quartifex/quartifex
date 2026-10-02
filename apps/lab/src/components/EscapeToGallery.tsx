"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** On a Lab seed's page, Escape goes back to the gallery (unless typing or a control uses it). */
export function EscapeToGallery() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input[type=text], input[type=search], textarea, select, dialog")) {
        return;
      }
      router.push("/lab");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
