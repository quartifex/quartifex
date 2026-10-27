"use client";

import { useAuth } from "./AuthProvider";
import styles from "./Shell.module.css";

/** Heart on a catalog card. Signed-out visitors get the login dialog instead. */
export function FavoriteButton({ itemId, name }: { itemId: string; name: string }) {
  const { favorites, toggleFavorite } = useAuth();
  const on = favorites.has(itemId);
  return (
    <button
      type="button"
      className={styles.heart}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={() => toggleFavorite(itemId)}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.6 3.9 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.1 0 5.3 3.1 4.2 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
