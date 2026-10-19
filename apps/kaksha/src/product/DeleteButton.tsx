"use client";
// The one pattern for deleting something that holds marks: a confirmation that says
// exactly what goes with it, then Undo for 12 seconds. Nothing is deleted on one tap.
import { useState } from "react";
import { restoreSnapshot, type Snapshot } from "../lib/db";
import { useApp } from "./context";
import { offerUndo } from "./UndoBar";
import { Icon, Sheet } from "./ui";

export function DeleteButton({
  label,
  name,
  load,
  describe,
  remove,
  after,
}: {
  /** The button's accessible name, e.g. "Delete this test". */
  label: string;
  /** The thing's own name, shown in the sheet and in the Undo bar. */
  name: string;
  load: () => Promise<Snapshot>;
  describe: (snap: Snapshot) => string;
  remove: () => Promise<void>;
  after: () => void;
}) {
  const { t } = useApp();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label={label}
        onClick={async () => setSnap(await load())}
      >
        <Icon name="trash" />
      </button>
      <Sheet open={snap !== null} onClose={() => setSnap(null)} title={t("del.title", { name })}>
        {snap ? (
          <div className="stack">
            <p>{describe(snap)}</p>
            <p className="small muted">{t("del.undoNote")}</p>
            {error ? (
              <p className="error" role="alert">
                {t("del.failed")}
              </p>
            ) : null}
            <div className="row">
              <button
                type="button"
                className="btn btn--danger"
                disabled={busy}
                data-testid="confirm-delete"
                onClick={async () => {
                  setBusy(true);
                  setError(false);
                  try {
                    await remove();
                    const kept = snap;
                    setSnap(null);
                    offerUndo(t("undo.deleted", { name }), t("undo.back", { name }), () =>
                      restoreSnapshot(kept),
                    );
                    after();
                  } catch {
                    setError(true);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Icon name="trash" />
                {busy ? t("del.deleting") : t("del.confirm")}
              </button>
              <button type="button" className="btn" onClick={() => setSnap(null)}>
                {t("del.keep")}
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
