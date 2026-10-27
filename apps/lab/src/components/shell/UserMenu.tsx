"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "./AuthProvider";
import styles from "./Shell.module.css";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Signed-in user card: opens the account area; sign out is a plain POST form. */
export function UserMenu({
  name,
  email,
  avatar,
}: {
  name: string;
  email: string;
  avatar: string | null;
}) {
  return (
    <div className={styles.userCard}>
      <Link href="/account/profile" className={styles.userLink}>
        {avatar ? (
          // biome-ignore lint/performance/noImgElement: small remote avatar, no layout shift (fixed size)
          <img src={avatar} alt="" width={36} height={36} className={styles.avatar} />
        ) : (
          <span className={styles.avatar} aria-hidden="true">
            {initials(name)}
          </span>
        )}
        <span className={styles.userText}>
          <strong>{name}</strong>
          <small>{email}</small>
        </span>
      </Link>
      <form action="/auth/signout" method="post">
        <button type="submit" className="btn sm ghost" data-fx="" style={{ width: "100%" }}>
          <span className="lbl">
            <span>Sign out</span>
          </span>
        </button>
      </form>
    </div>
  );
}

export function SignInButtons() {
  const { openAuth } = useAuth();
  return (
    <div className={styles.signIn}>
      <Button cta onClick={openAuth}>
        Sign in
      </Button>
      <Button variant="soft" onClick={openAuth}>
        Create account
      </Button>
    </div>
  );
}
