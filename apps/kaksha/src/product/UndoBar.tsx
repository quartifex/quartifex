"use client";
// One place for "done, and you can take it back": after a delete, the bar names what
// went and offers Undo for 12 seconds. Undo puts back every row exactly as it was.
import { useEffect, useState, useSyncExternalStore } from "react";
import { useApp } from "./context";
import { Icon } from "./ui";

interface Undoable {
  id: number;
  message: string;
  undo: () => Promise<void>;
  undone: string;
}

let current: Undoable | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => {
  for (const fn of listeners) fn();
};

/** Offer Undo for something that just happened. Replaces any earlier offer. */
export function offerUndo(message: string, undone: string, undo: () => Promise<void>): void {
  seq += 1;
  current = { id: seq, message, undo, undone };
  emit();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const UNDO_MS = 12_000;

export function UndoBar() {
  const { t } = useApp();
  const offer = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  const [done, setDone] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!offer) return;
    setDone(null);
    setFailed(false);
    const id = window.setTimeout(() => {
      if (current?.id === offer.id) {
        current = null;
        emit();
      }
    }, UNDO_MS);
    return () => window.clearTimeout(id);
  }, [offer]);

  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setDone(null), 4000);
    return () => window.clearTimeout(id);
  }, [done]);

  if (!offer && !done) return null;
  return (
    <div className="undobar" role="status" data-testid="undo-bar">
      {offer ? (
        <>
          <span>{failed ? t("undo.failed") : offer.message}</span>
          <button
            type="button"
            className="undobar__btn"
            onClick={async () => {
              try {
                await offer.undo();
                current = null;
                setDone(offer.undone);
                emit();
              } catch {
                setFailed(true);
              }
            }}
          >
            <Icon name="undo" />
            {failed ? t("save.retry") : t("entry.undo")}
          </button>
        </>
      ) : (
        <span>
          <Icon name="check" />
          {done}
        </span>
      )}
    </div>
  );
}
