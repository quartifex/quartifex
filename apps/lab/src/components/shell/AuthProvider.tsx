"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./Auth.module.css";
import dialogStyles from "./AuthDialog.module.css";
import { AuthForm } from "./AuthForm";

type Ctx = {
  signedIn: boolean;
  favorites: ReadonlySet<string>;
  toggleFavorite: (itemId: string) => Promise<void>;
  openAuth: () => void;
};

const AuthContext = createContext<Ctx | null>(null);

export function useAuth(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Holds who is signed in, their saved items, and the login dialog the whole shell can open. */
export function AuthProvider({
  userId,
  initialFavorites,
  children,
}: {
  userId: string | null;
  initialFavorites: string[];
  children: ReactNode;
}) {
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(() => new Set(initialFavorites));
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  const openAuth = useCallback(() => dialog.current?.showModal(), []);

  const toggleFavorite = useCallback(
    async (itemId: string) => {
      if (!userId) return openAuth();
      const had = favorites.has(itemId);
      const next = new Set(favorites);
      if (had) next.delete(itemId);
      else next.add(itemId);
      setFavorites(next);
      const supabase = createClient();
      const { error } = had
        ? await supabase.from("favorites").delete().match({ user_id: userId, item_id: itemId })
        : await supabase.from("favorites").insert({ user_id: userId, item_id: itemId });
      if (error) setFavorites(favorites); // roll back
    },
    [favorites, userId, openAuth],
  );

  useEffect(() => {
    // `?auth=1` opens the dialog (links from other pages).
    if (new URLSearchParams(window.location.search).get("auth") === "1" && !userId) openAuth();
  }, [openAuth, userId]);

  const value = useMemo(
    () => ({ signedIn: userId !== null, favorites, toggleFavorite, openAuth }),
    [userId, favorites, toggleFavorite, openAuth],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a pointer shortcut; Escape closes a native dialog */}
      <dialog
        ref={dialog}
        className={dialogStyles.dialog}
        aria-label="Sign in to Quartifex Lab"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <button
          type="button"
          className={dialogStyles.close}
          aria-label="Close"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <div className={styles.dialogBody}>
          <AuthForm next={pathname} onDone={() => dialog.current?.close()} />
        </div>
      </dialog>
    </AuthContext.Provider>
  );
}
