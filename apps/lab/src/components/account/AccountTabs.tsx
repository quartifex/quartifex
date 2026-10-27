"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Account.module.css";

const TABS = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/security", label: "Security" },
  { href: "/account/saved", label: "Saved" },
  { href: "/account/tickets", label: "Tickets" },
  { href: "/account/data", label: "Data" },
];

export function AccountTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Account">
      <ul className={styles.tabs}>
        {TABS.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              className={styles.tab}
              aria-current={path.startsWith(tab.href) ? "page" : undefined}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
