import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icon";
import { byKind, REPO } from "@/lib/catalog";
import type { Profile } from "@/lib/supabase/server";
import styles from "./Shell.module.css";
import { type NavGroup, SidebarNav } from "./SidebarNav";
import { SignInButtons, UserMenu } from "./UserMenu";

type Props = {
  user: { email: string | null } | null;
  profile: Profile | null;
};

/** The app-shell sidebar, built from the kit: depth surface, animated logo with its LAB tag. */
export function Sidebar({ user, profile }: Props) {
  const groups: NavGroup[] = [
    {
      label: "Browse",
      items: [
        { href: "/", label: "Home", icon: "home" },
        { href: "/?kind=lib", label: "Libraries", icon: "stack", count: byKind("lib").length },
        { href: "/?kind=site", label: "Sites", icon: "window", count: byKind("site").length },
        { href: "/lab", label: "Lab seeds", icon: "flask", count: byKind("lab").length },
      ],
    },
    ...(user
      ? [
          {
            label: "Your Lab",
            items: [
              { href: "/account/saved", label: "Saved", icon: "heart" as const },
              { href: "/account/tickets", label: "Tickets", icon: "chat" as const },
              { href: "/account/profile", label: "Account", icon: "user" as const },
            ],
          },
        ]
      : []),
    {
      label: "Elsewhere",
      items: [
        { href: "https://quartifex.com", label: "Quartifex studio", icon: "arrow", external: true },
        { href: REPO, label: "Source on GitHub", icon: "code", external: true },
      ],
    },
  ];

  return (
    <aside className={styles.sidebar} aria-label="Lab navigation">
      <div className={styles.sideTop}>
        <Logo height={30} label="Quartifex Lab, home" />
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: the form itself is the grid container the styles target */}
      <form className={styles.search} action="/" role="search">
        <Icon name="search" />
        <label className="sr-only" htmlFor="side-search">
          Search the Lab
        </label>
        <input
          id="side-search"
          name="q"
          type="search"
          placeholder="Search the Lab"
          autoComplete="off"
        />
      </form>

      <SidebarNav groups={groups} />

      <div className={styles.sideBottom}>
        <div className={styles.utility}>
          <Link href={user ? "/account/tickets/new" : "/?auth=1"} className={styles.helpLink}>
            <Icon name="message" />
            Raise a ticket
          </Link>
          <div className={`pop2 ${styles.cogwrap}`} data-pop="side">
            <button
              type="button"
              className="btn icon ghost cogbtn"
              data-fx=""
              data-cog=""
              aria-label="Settings"
              aria-haspopup="dialog"
              aria-expanded="false"
            >
              <Icon name="cog" />
              <span className="cogviz" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
            </button>
            <div className="settings" data-settings="" role="dialog" aria-label="Settings" />
          </div>
        </div>
        {user ? (
          <UserMenu
            name={profile?.display_name ?? user.email ?? "You"}
            email={user.email ?? ""}
            avatar={profile?.avatar_url ?? null}
          />
        ) : (
          <SignInButtons />
        )}
      </div>
    </aside>
  );
}
