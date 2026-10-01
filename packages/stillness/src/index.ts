// @quartifex/stillness (L06, Accessibility). A motion policy for cinematic pages. Every
// effect declares what it does at three levels (full, reduced, static); stillness picks
// the level from the visitor's preference, an on-page choice and Save-Data, and runs the
// right variant, switching live when any of them changes. The DOM kit (chapter rail, skip
// links, focus management, live progress) is in ./dom; React in ./react.

export type Level = "full" | "reduced" | "static";
/** "auto" follows `prefers-reduced-motion`; a level pins it. */
export type Preference = "auto" | Level;

/** Undo whatever a variant set up. */
export type Cleanup = () => void;
type Variant = (() => Cleanup | undefined) | (() => void);

export type EffectDefinition = {
  name: string;
  /** Heavy media (video, long sequences, WebGL): runs its static variant when Save-Data is on. */
  heavy?: boolean;
  full: Variant;
  /** Gentler motion: fades instead of travel, shorter, no parallax. Default: the static variant. */
  reduced?: Variant;
  /** No motion: the end state, shown at once. Default: nothing. */
  static?: Variant;
};

export type EffectState = { name: string; heavy: boolean; running: Level };

export type StillnessWindow = {
  matchMedia?: (query: string) => {
    matches: boolean;
    addEventListener?: (t: "change", f: () => void) => void;
    removeEventListener?: (t: "change", f: () => void) => void;
  };
  navigator?: { connection?: { saveData?: boolean } };
  localStorage?: Pick<Storage, "getItem" | "setItem">;
};

export type Options = {
  /** Start with this preference instead of the stored one. */
  preference?: Preference;
  /** Remember the visitor's choice under this key. Default "qx-motion"; null to not store. */
  storageKey?: string | null;
  /** Force Save-Data on or off. Default: the browser's flag and `prefers-reduced-data`. */
  saveData?: boolean;
  window?: StillnessWindow;
};

export type Stillness = {
  /** The level effects run at now. */
  readonly level: Level;
  readonly preference: Preference;
  /** What the operating system asks for, ignoring the on-page choice. */
  readonly systemLevel: Level;
  readonly saveData: boolean;
  /** Set the on-page choice ("auto" goes back to the system). */
  set(preference: Preference): void;
  /** Called with the new level whenever it changes. Returns an unsubscribe. */
  subscribe(listener: (level: Level) => void): () => void;
  /** Register an effect: its variant for the current level runs now and switches on change. */
  effect(definition: EffectDefinition): { readonly running: Level; destroy(): void };
  /** Every registered effect and the variant it is running, for audits and debug panels. */
  effects(): EffectState[];
  destroy(): void;
};

const LEVELS: readonly Preference[] = ["auto", "full", "reduced", "static"];

/** The level an effect actually runs at, given the page level and Save-Data. Pure. */
export function levelFor(level: Level, heavy: boolean, saveData: boolean): Level {
  return heavy && saveData ? "static" : level;
}

/** Resolve a preference against the system setting. Pure. */
export function resolveLevel(preference: Preference, systemReduced: boolean): Level {
  if (preference !== "auto") return preference;
  return systemReduced ? "reduced" : "full";
}

export function createStillness(options: Options = {}): Stillness {
  const win: StillnessWindow =
    options.window ?? (typeof window === "undefined" ? {} : (window as unknown as StillnessWindow));
  const key = options.storageKey === undefined ? "qx-motion" : options.storageKey;
  const reducedQuery = win.matchMedia?.("(prefers-reduced-motion: reduce)");
  const dataQuery = win.matchMedia?.("(prefers-reduced-data: reduce)");
  const read = (): Preference | null => {
    if (!key) return null;
    try {
      const stored = win.localStorage?.getItem(key);
      return LEVELS.includes(stored as Preference) ? (stored as Preference) : null;
    } catch {
      return null;
    }
  };

  let preference: Preference = options.preference ?? read() ?? "auto";
  const saveData =
    options.saveData ??
    (Boolean(win.navigator?.connection?.saveData) || Boolean(dataQuery?.matches));
  const systemLevel = () => resolveLevel("auto", Boolean(reducedQuery?.matches));
  let level = resolveLevel(preference, Boolean(reducedQuery?.matches));
  const listeners = new Set<(level: Level) => void>();
  const running = new Map<
    number,
    { def: EffectDefinition; at: Level; cleanup: Cleanup | undefined }
  >();
  let nextId = 0;

  const variant = (def: EffectDefinition, at: Level): Variant | undefined =>
    at === "full" ? def.full : at === "reduced" ? (def.reduced ?? def.static) : def.static;

  const start = (id: number) => {
    const entry = running.get(id);
    if (!entry) return;
    entry.at = levelFor(level, Boolean(entry.def.heavy), saveData);
    entry.cleanup = variant(entry.def, entry.at)?.() ?? undefined;
  };
  const stop = (id: number) => {
    const entry = running.get(id);
    entry?.cleanup?.();
    if (entry) entry.cleanup = undefined;
  };

  const update = () => {
    const next = resolveLevel(preference, Boolean(reducedQuery?.matches));
    if (next === level) return;
    level = next;
    for (const id of running.keys()) {
      const entry = running.get(id);
      if (entry && levelFor(level, Boolean(entry.def.heavy), saveData) !== entry.at) {
        stop(id);
        start(id);
      }
    }
    for (const listener of [...listeners]) listener(level);
  };
  reducedQuery?.addEventListener?.("change", update);

  return {
    get level() {
      return level;
    },
    get preference() {
      return preference;
    },
    get systemLevel() {
      return systemLevel();
    },
    saveData,
    set(next) {
      preference = next;
      if (key) {
        try {
          win.localStorage?.setItem(key, next);
        } catch {
          // Storage can be unavailable; the choice then lasts for this page only.
        }
      }
      update();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    effect(def) {
      const id = nextId++;
      running.set(id, { def, at: level, cleanup: undefined });
      start(id);
      return {
        get running() {
          return running.get(id)?.at ?? level;
        },
        destroy() {
          stop(id);
          running.delete(id);
        },
      };
    },
    effects() {
      return [...running.values()].map(({ def, at }) => ({
        name: def.name,
        heavy: Boolean(def.heavy),
        running: at,
      }));
    },
    destroy() {
      reducedQuery?.removeEventListener?.("change", update);
      for (const id of running.keys()) stop(id);
      running.clear();
      listeners.clear();
    },
  };
}
