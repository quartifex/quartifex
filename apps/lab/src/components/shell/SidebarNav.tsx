"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import type { IconName as KitIcon } from "@/lib/icons";
import styles from "./Shell.module.css";

export type IconName =
  | "home"
  | "stack"
  | "window"
  | "flask"
  | "heart"
  | "chat"
  | "user"
  | "arrow"
  | "code";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  count?: number;
  external?: boolean;
};
export type NavGroup = { label: string; items: NavItem[] };

/** Nav icons come from the kit's set; the two it lacks are drawn on the same grid and weight. */
const KIT: Partial<Record<IconName, KitIcon>> = {
  home: "home",
  stack: "grid",
  window: "work",
  flask: "flask",
  heart: "heart",
  chat: "message",
  arrow: "arrowur",
};

const LOCAL: Partial<Record<IconName, string>> = {
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  code: '<path d="m9 7-5 5 5 5"/><path d="m15 7 5 5-5 5"/>',
};

export function NavIcon({ name }: { name: IconName }) {
  const kit = KIT[name];
  if (kit) return <Icon name={kit} />;
  return (
    <span
      className="ico"
      aria-hidden="true"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static path data defined in this file
      dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24">${LOCAL[name] ?? ""}</svg>` }}
    />
  );
}

function Items({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const kind = params.get("kind");

  const isCurrent = (item: NavItem) => {
    if (item.external) return false;
    const [path, query] = item.href.split("?");
    if (query) return pathname === path && kind === new URLSearchParams(query).get("kind");
    if (item.href === "/") return pathname === "/" && !kind;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <nav className={styles.nav} aria-label="Sections">
      {groups.map((group) => (
        <div key={group.label} className={styles.group}>
          <p className={styles.groupLabel}>{group.label}</p>
          <ul>
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={styles.item}
                  aria-current={isCurrent(item) ? "page" : undefined}
                  {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.count !== undefined && <em>{item.count}</em>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function SidebarNav({ groups }: { groups: NavGroup[] }) {
  return (
    <Suspense fallback={null}>
      <Items groups={groups} />
    </Suspense>
  );
}
