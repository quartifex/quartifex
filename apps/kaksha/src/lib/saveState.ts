// Whether the taps a teacher makes have reached the phone's storage. Every marking write
// goes through `tracked`, so the screen can say "saved" only when it is true, and say
// plainly when it is not, with the failed writes kept to try again.

export type SaveProblem = "quota" | "blocked" | "other";

export interface SaveState {
  /** Writes started and not yet finished. */
  pending: number;
  /** Writes that failed and are waiting to be tried again. */
  failed: number;
  problem: SaveProblem | null;
  /** When the last write reached storage (ms since epoch), or 0. */
  lastSaved: number;
}

let state: SaveState = { pending: 0, failed: 0, problem: null, lastSaved: 0 };
const queue: Array<() => Promise<unknown>> = [];
const listeners = new Set<() => void>();

function set(patch: Partial<SaveState>) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn();
}

export function subscribeSave(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getSaveState(): SaveState {
  return state;
}

/** Sort a storage error into what the teacher can do about it. */
export function storageProblem(error: unknown): SaveProblem {
  const names: string[] = [];
  let e: unknown = error;
  // Dexie wraps the browser's error; look through the chain.
  for (let i = 0; i < 4 && e && typeof e === "object"; i++) {
    const o = e as { name?: unknown; inner?: unknown };
    if (typeof o.name === "string") names.push(o.name);
    e = o.inner;
  }
  if (names.some((n) => /Quota/i.test(n))) return "quota";
  if (
    names.some((n) =>
      /MissingAPI|OpenFailed|InvalidState|SecurityError|DatabaseClosed|NotAllowed/i.test(n),
    )
  )
    return "blocked";
  return "other";
}

/**
 * Run one write. On failure the write is kept in a queue (the screen still shows the
 * teacher's tap), the problem is reported to every listener, and nothing is thrown.
 */
export async function tracked<T>(run: () => Promise<T>): Promise<T | undefined> {
  set({ pending: state.pending + 1 });
  try {
    const out = await run();
    set({ pending: state.pending - 1, lastSaved: Date.now() });
    return out;
  } catch (error) {
    queue.push(run);
    set({ pending: state.pending - 1, failed: queue.length, problem: storageProblem(error) });
    if (typeof console !== "undefined") console.error("Kaksha: a write failed", error);
    return undefined;
  }
}

/** Try every failed write again, in the order the teacher made them. */
export async function retryFailed(): Promise<boolean> {
  while (queue.length > 0) {
    const run = queue[0];
    if (!run) break;
    try {
      await run();
      queue.shift();
      set({ failed: queue.length, lastSaved: Date.now() });
    } catch (error) {
      set({ failed: queue.length, problem: storageProblem(error) });
      return false;
    }
  }
  set({ failed: 0, problem: null });
  return true;
}

/** For tests only. */
export function resetSaveState(): void {
  queue.length = 0;
  state = { pending: 0, failed: 0, problem: null, lastSaved: 0 };
}
