"use client";
// When a screen throws, the teacher sees what happened, that their saved marks are
// safe, and a way on: reload, go to Today, or report it. Never a blank page.
import { Component, type ReactNode } from "react";
import { APP_VERSION } from "../config";
import { type SaveProblem, storageProblem } from "../lib/saveState";
import { useApp } from "./context";
import { Icon } from "./ui";

interface Props {
  children: ReactNode;
  resetKey: string;
  render: (error: Error, reset: () => void) => ReactNode;
}

class Boundary extends Component<Props, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error) {
    console.error("Kaksha: a screen stopped", error);
  }
  // Moving to another screen clears the error. The boundary is not re-keyed, so screens
  // that keep state across routes (setup, marking) are not remounted.
  override componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  reset = () => this.setState({ error: null });
  override render() {
    return this.state.error ? this.props.render(this.state.error, this.reset) : this.props.children;
  }
}

export function ScreenProblem({
  problem,
  detail,
  onRetry,
}: {
  problem: Exclude<SaveProblem, "other"> | "screen" | "offline";
  detail?: string | undefined;
  onRetry: () => void;
}) {
  const { t, go } = useApp();
  const title =
    problem === "screen" ? t("crash.title") : t(`crash.${problem}Title` as "crash.title");
  const body = problem === "screen" ? t("crash.body") : t(`crash.${problem}Body` as "crash.body");
  return (
    <main className="k-main">
      <div className="card problem" role="alert" data-testid="screen-problem">
        <span className="problem__icon" aria-hidden="true">
          <Icon name="alert" />
        </span>
        <h1 className="problem__title">{title}</h1>
        <p>{body}</p>
        <p className="problem__safe">
          <Icon name="shield" />
          {t("crash.safe")}
        </p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            <Icon name="refresh" />
            {t("crash.retry")}
          </button>
          <button type="button" className="btn" onClick={() => go("/")}>
            <Icon name="home" />
            {t("crash.today")}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => go("/more/problem")}>
            <Icon name="lifebuoy" />
            {t("crash.report")}
          </button>
        </div>
        {detail ? (
          <details className="small muted">
            <summary>{t("crash.details")}</summary>
            <code>
              {detail} · v{APP_VERSION}
            </code>
          </details>
        ) : null}
      </div>
    </main>
  );
}

/** Wraps the screens. A new `resetKey` (the route) clears the error when the teacher moves on. */
export function ScreenBoundary({ children, resetKey }: { children: ReactNode; resetKey: string }) {
  return (
    <Boundary
      resetKey={resetKey}
      render={(error, reset) => {
        const p = storageProblem(error);
        const kind = p === "other" ? "screen" : p;
        // A lazy screen that could not load (offline, before it was cached) is a reload away.
        const chunk = /Loading chunk|dynamically imported module|Importing a module script/i.test(
          error.message,
        );
        return (
          <ScreenProblem
            problem={chunk ? "offline" : kind}
            detail={`${error.name}: ${error.message}`.slice(0, 160)}
            onRetry={() => (chunk || p !== "other" ? location.reload() : reset())}
          />
        );
      }}
    >
      {children}
    </Boundary>
  );
}
