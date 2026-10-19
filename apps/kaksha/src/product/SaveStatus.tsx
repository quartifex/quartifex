"use client";
// The line under the marking controls. It says "saved" only once the phone's storage
// has the tap, and if a write fails it says so where the teacher is looking, keeps the
// taps on screen, and offers to try again.
import { useEffect, useState, useSyncExternalStore } from "react";
import { getSaveState, retryFailed, subscribeSave } from "../lib/saveState";
import { useApp } from "./context";
import { Icon } from "./ui";

const server = { pending: 0, failed: 0, problem: null, lastSaved: 0 } as const;

export function useSaveState() {
  return useSyncExternalStore(subscribeSave, getSaveState, () => server);
}

export function SaveStatus() {
  const { t, locale, go } = useApp();
  const s = useSaveState();
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [stillFailing, setStillFailing] = useState(false);

  // Only say "Saving…" if a write takes long enough for a teacher to notice.
  useEffect(() => {
    if (s.pending === 0) {
      setSlow(false);
      return;
    }
    const id = window.setTimeout(() => setSlow(true), 400);
    return () => window.clearTimeout(id);
  }, [s.pending]);

  // Closing the tab with unsaved taps asks first.
  useEffect(() => {
    if (s.failed === 0) return;
    const stop = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, [s.failed]);

  if (s.failed > 0 && s.problem) {
    return (
      <div className="notice notice--bad save-alert" role="alert" data-testid="save-alert">
        <p>
          <strong>{t("save.failedTitle", { n: s.failed })}</strong>{" "}
          {t(`save.${s.problem}` as "save.quota")}
        </p>
        {stillFailing ? <p className="small">{t("save.still")}</p> : null}
        <div className="row">
          <button
            type="button"
            className="btn btn--sm btn--primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await retryFailed();
              setStillFailing(!ok);
              setBusy(false);
            }}
          >
            <Icon name="refresh" />
            {busy ? t("save.trying") : t("save.retry")}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => go("/more/problem")}>
            {t("save.help")}
          </button>
        </div>
      </div>
    );
  }

  const time = s.lastSaved
    ? new Date(s.lastSaved).toLocaleTimeString(locale === "hi" ? "hi-IN" : "en-IN", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  return (
    <p className="small muted no-print save-line" data-testid="save-line">
      <Icon name={slow ? "clock" : "check"} />
      {slow ? t("save.saving") : time ? t("save.savedAt", { time }) : t("entry.saved")}
    </p>
  );
}
