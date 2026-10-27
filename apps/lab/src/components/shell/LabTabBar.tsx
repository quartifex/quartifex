"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/icons";
import { leaveTo } from "@/lib/xsite";

type Tab = { label: string; href: string; icon: IconName; external?: boolean };

/** The Lab's own sections; the studio sits last and hands over with the cross-site wipe. */
const TABS: readonly Tab[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Libraries", href: "/?kind=lib", icon: "grid" },
  { label: "Sites", href: "/?kind=site", icon: "work" },
  { label: "Seeds", href: "/lab", icon: "flask" },
  { label: "Saved", href: "/account/saved", icon: "heart" },
  { label: "Studio", href: "https://quartifex.com", icon: "sparkle", external: true },
];

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const selectedIndex = (pathname: string, kind: string | null) => {
  const found = TABS.findIndex((t) => {
    if (t.external) return false;
    const [path, query] = t.href.split("?");
    if (query) return pathname === path && kind === new URLSearchParams(query).get("kind");
    if (t.href === "/") return pathname === "/" && !kind;
    return pathname === path || pathname.startsWith(`${path}/`);
  });
  return found < 0 ? 0 : found;
};

/**
 * The studio site's mobile bar, carrying the Lab's links: a raised knob slides to the selected
 * tab, and a plus holds whatever does not fit. Shown only on phones (see lab-kit.css).
 */
function Bar() {
  const pathname = usePathname();
  const kind = useSearchParams().get("kind");
  const router = useRouter();
  const selected = selectedIndex(pathname, kind);
  const barRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const [hidden, setHidden] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const layout = useCallback(
    (instant: boolean) => {
      const bar = barRef.current;
      const ind = indRef.current;
      if (!bar || !ind) return;
      const avail = bar.clientWidth - 12;
      const cap = 1 + Math.floor((avail - 118) / 50);
      const n = TABS.length;
      let show: number[];
      if (n <= cap) show = TABS.map((_, i) => i);
      else {
        show = [selected];
        for (let i = 0; i < n && show.length < Math.max(1, cap - 1); i++)
          if (i !== selected) show.push(i);
      }
      show.sort((a, b) => a - b);
      setHidden(TABS.map((_, i) => i).filter((i) => !show.includes(i)));
      if (n <= cap) setMenuOpen(false);

      // knob: the selected tab is wide, the others 48px, the free space shared between them
      const sel = bar.querySelector<HTMLElement>(`[data-k="${selected}"]`);
      const label = sel?.querySelector<HTMLElement>(".tl");
      const lw = Math.min(76, label?.scrollWidth ?? 40);
      const sw = 14 + 28 + 7 + lw + 16;
      const m = show.length + (n > cap ? 1 : 0);
      const widths = [...show.map((i) => (i === selected ? sw : 48)), ...(n > cap ? [48] : [])];
      const sum = widths.reduce((a, b) => a + b, 0);
      const free = m > 1 ? (bar.clientWidth - 12 - sum - 2 * (m - 1)) / (m - 1) : 0;
      let x = 6;
      for (let k = 0; k < show.length && show[k] !== selected; k++)
        x += (widths[k] ?? 48) + 2 + free;
      if (instant) ind.classList.add("nt");
      ind.style.width = `${sw}px`;
      ind.style.transform = `translateX(${x.toFixed(1)}px)`;
      ind.style.opacity = "1";
      if (instant) {
        void ind.offsetWidth;
        ind.classList.remove("nt");
      }
    },
    [selected],
  );

  useIsoLayoutEffect(() => {
    layout(false);
  }, [layout]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(() => layout(true));
    ro.observe(bar);
    document.fonts?.ready.then(() => layout(true));
    return () => ro.disconnect();
  }, [layout]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!(e.target instanceof Node)) return;
      if (
        barRef.current?.contains(e.target) ||
        document.getElementById("lab-moremenu")?.contains(e.target)
      )
        return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  const go = (i: number) => {
    const tab = TABS[i];
    if (!tab) return;
    setMenuOpen(false);
    if (tab.external) leaveTo(tab.href);
    else router.push(tab.href);
  };

  return (
    <>
      <div
        className={menuOpen ? "moremenu open" : "moremenu"}
        id="lab-moremenu"
        role="menu"
        aria-label="More sections"
      >
        {hidden.map((i) => {
          const tab = TABS[i];
          return tab ? (
            <button key={tab.href} type="button" role="menuitem" onClick={() => go(i)}>
              <Icon name={tab.icon} />
              {tab.label}
            </button>
          ) : null;
        })}
      </div>
      <div className="tabbar" ref={barRef} role="tablist" aria-label="Lab sections">
        <span className="tab-ind" ref={indRef} aria-hidden="true" />
        {TABS.map((tab, i) => {
          const gone = hidden.includes(i);
          const common = {
            className: gone ? "tab gone" : "tab",
            "data-k": i,
            "aria-label": tab.label,
          } as const;
          const inner = (
            <>
              <Icon name={tab.icon} />
              <span className="tl">{tab.label}</span>
            </>
          );
          return tab.external ? (
            <a key={tab.href} href={tab.href} {...common}>
              {inner}
            </a>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={i === selected}
              {...common}
            >
              {inner}
            </Link>
          );
        })}
        <button
          type="button"
          className={hidden.length ? "tab more" : "tab more gone"}
          aria-label="More sections"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name="more" />
        </button>
      </div>
    </>
  );
}

export function LabTabBar() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
