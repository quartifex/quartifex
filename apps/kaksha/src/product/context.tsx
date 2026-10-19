"use client";
// App-wide state that is not data: language, theme, text size, and the router.
// Preferences live in localStorage so they apply before the first paint.
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isLoaded,
  isLocale,
  type Key,
  LOCALE_KEY,
  LOCALES,
  type Locale,
  loadLocale,
  readStoredLocale,
  translate,
} from "../i18n";

export type Theme = "light" | "dark" | "system";
export type TextSize = "s" | "m" | "l" | "xl";

interface Prefs {
  locale: Locale;
  theme: Theme;
  size: TextSize;
}

interface AppContext extends Prefs {
  t: (key: Key, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
  setTheme: (t: Theme) => void;
  setSize: (s: TextSize) => void;
  route: string[];
  go: (path: string, replace?: boolean) => void;
  back: (fallback: string) => void;
}

const Ctx = createContext<AppContext | null>(null);

export function useApp(): AppContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}

const read = <T extends string>(key: string, ok: readonly T[], fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v && (ok as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or storage blocked: the choice lasts for this visit only.
  }
};

/** The product page passes its language to the embedded demo as ?lang=. */
function urlLocale(): Locale | null {
  if (typeof location === "undefined") return null;
  const v = new URLSearchParams(location.search).get("lang");
  return isLocale(v) ? v : null;
}

function parseHash(): string[] {
  if (typeof location === "undefined") return [];
  return location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
}

export function AppProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [prefs, setPrefs] = useState<Prefs>(() => ({
    locale: initialLocale ?? urlLocale() ?? readStoredLocale() ?? "en",
    theme:
      typeof window === "undefined"
        ? "system"
        : read<Theme>("kaksha-theme", ["light", "dark", "system"], "system"),
    size:
      typeof window === "undefined"
        ? "m"
        : read<TextSize>("kaksha-size", ["s", "m", "l", "xl"], "m"),
  }));
  const [route, setRoute] = useState<string[]>(parseHash);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = LOCALES[prefs.locale].intl.split("-")[0] ?? "en";
    root.dataset.theme = prefs.theme;
    root.dataset.size = prefs.size;
  }, [prefs]);

  const go = useCallback((path: string, replace = false) => {
    const url = `${location.pathname}${location.search}#${path.startsWith("/") ? path : `/${path}`}`;
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
    setRoute(parseHash());
    window.scrollTo(0, 0);
  }, []);

  // "Back" always goes to the screen above in the app's own tree, so it works the
  // same whether the teacher arrived by a link, a reload or the home screen icon.
  const back = useCallback((parent: string) => go(parent), [go]);

  const value = useMemo<AppContext>(
    () => ({
      ...prefs,
      t: (key, vars) => translate(prefs.locale, key, vars),
      setLocale: (locale) => {
        write(LOCALE_KEY, locale);
        void loadLocale(locale).then(() => setPrefs((p) => ({ ...p, locale })));
      },
      setTheme: (theme) => {
        write("kaksha-theme", theme);
        setPrefs((p) => ({ ...p, theme }));
      },
      setSize: (size) => {
        write("kaksha-size", size);
        setPrefs((p) => ({ ...p, size }));
      },
      route,
      go,
      back,
    }),
    [prefs, route, go, back],
  );

  // A language other than English loads once, before the first screen that needs it.
  const [, setLoadedTick] = useState(0);
  const ready = isLoaded(prefs.locale);
  useEffect(() => {
    if (!ready) void loadLocale(prefs.locale).then(() => setLoadedTick((n) => n + 1));
  }, [ready, prefs.locale]);

  return <Ctx.Provider value={value}>{ready ? children : null}</Ctx.Provider>;
}
