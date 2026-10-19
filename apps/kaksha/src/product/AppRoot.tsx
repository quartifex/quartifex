"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import { db, getSetting, isDemo } from "../lib/db";
import { type SaveProblem, storageProblem } from "../lib/saveState";
import { AppProvider, useApp } from "./context";
import { DeskBar } from "./DeskBar";
import { ScreenBoundary, ScreenProblem } from "./ErrorBoundary";
import { PinGate } from "./PinGate";
import { Home } from "./screens/Home";
import { UndoBar } from "./UndoBar";
import { Icon, TabBar } from "./ui";

const ClassScreen = lazy(() => import("./screens/ClassScreen"));
const NewClass = lazy(() => import("./screens/NewClass"));
const NewTest = lazy(() => import("./screens/NewTest"));
const Mark = lazy(() => import("./screens/Mark"));
const Grid = lazy(() => import("./screens/Grid"));
const Results = lazy(() => import("./screens/Results"));
const StudentScreen = lazy(() => import("./screens/StudentScreen"));
const Report = lazy(() => import("./screens/Report"));
const Settings = lazy(() => import("./screens/Settings"));
const Roster = lazy(() => import("./screens/Roster"));
const Onboarding = lazy(() => import("./screens/Onboarding"));
const Classes = lazy(() => import("./screens/Classes"));
const Insights = lazy(() => import("./screens/Insights"));
const Reports = lazy(() => import("./screens/Reports"));
const Notes = lazy(() => import("./screens/Notes"));

function Screens() {
  const { route } = useApp();
  const [head, id, sub] = route;
  if (head === "welcome") return <Onboarding step={Math.max(0, Math.min(8, Number(id) || 0))} />;
  if (head === "new-class") return <NewClass />;
  if (head === "classes") return <Classes />;
  if (head === "insights") return <Insights />;
  if (head === "settings" || head === "more") return <Settings page={id} />;
  if (head === "class" && id) {
    if (sub === "new") return <NewTest classId={id} />;
    if (sub === "roster") return <Roster classId={id} />;
    if (sub === "reports") return <Reports classId={id} />;
    if (sub === "cards") return <Report kind="cards" id={id} />;
    return <ClassScreen classId={id} tab={sub ?? "tests"} />;
  }
  if (head === "test" && id) {
    if (sub === "mark") return <Mark assessmentId={id} start={route[3]} />;
    if (sub === "grid") return <Grid assessmentId={id} />;
    if (sub === "report") return <Report kind="class" id={id} />;
    return <Results assessmentId={id} tab={sub} item={route[3]} />;
  }
  if (head === "student" && id) {
    if (sub === "report") return <Report kind="student" id={id} />;
    if (sub === "notes") return <Notes studentId={id} />;
    return <StudentScreen studentId={id} />;
  }
  return <Home />;
}

/** A phone with no classes that has never finished setup starts at the welcome screens. */
function FirstRun() {
  const { route, go } = useApp();
  useEffect(() => {
    if (isDemo()) return;
    const head = route[0] ?? "";
    if (head !== "" && head !== "today") return;
    let live = true;
    void (async () => {
      const [count, done] = await Promise.all([db().classes.count(), getSetting("onboarded")]);
      if (live && count === 0 && !done) go("/welcome/0", true);
    })();
    return () => {
      live = false;
    };
  }, [route, go]);
  return null;
}

/** Inside the product page's device frame the page shows the demo label itself. */
function isEmbedded(): boolean {
  if (typeof location === "undefined") return false;
  return new URLSearchParams(location.search).get("embed") === "1";
}

function DemoBanner() {
  const { t } = useApp();
  if (!isDemo() || isEmbedded()) return null;
  return (
    <div className="k-demo" role="note">
      <span>{t("demo.banner")}</span>
      <button
        type="button"
        className="k-demo__reset"
        aria-label={t("demo.reset")}
        onClick={async () => {
          const { resetDemo } = await import("./demoSeed");
          await resetDemo();
          location.hash = "#/";
          location.reload();
        }}
      >
        <Icon name="undo" />
        <span className="k-demo__resetText">{t("demo.resetShort")}</span>
      </button>
    </div>
  );
}

/** Blank only for the first 600 ms; after that it says what is happening. */
function Loading() {
  const { t } = useApp();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 600);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div aria-busy="true" className="k-loading">
      {slow ? <p className="muted">{t("common.opening")}</p> : null}
    </div>
  );
}

/** A new version has downloaded. It waits for the next start, or the teacher says now. */
function UpdateBanner() {
  const { t } = useApp();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (isDemo() || !("serviceWorker" in navigator)) return;
    let live = true;
    void navigator.serviceWorker.getRegistration("/app").then((reg) => {
      if (!reg || !live) return;
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        next?.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller && live)
            setWaiting(next);
        });
      });
    });
    return () => {
      live = false;
    };
  }, []);
  if (!waiting) return null;
  return (
    <div className="k-update" role="status">
      <span>{t("update.ready")}</span>
      <button
        type="button"
        className="k-demo__reset"
        onClick={() => {
          navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
          waiting.postMessage({ type: "SKIP_WAITING" });
        }}
      >
        <Icon name="refresh" />
        <span>{t("update.now")}</span>
      </button>
    </div>
  );
}

function Shell() {
  const [ready, setReady] = useState(!isDemo());
  const [blocked, setBlocked] = useState<{ p: SaveProblem; detail: string } | null>(null);
  const { locale, route } = useApp();
  const head = route[0] ?? "";
  const onb = head === "welcome";
  const top = ["", "today", "classes", "insights"].includes(head) || (head === "more" && !route[1]);

  useEffect(() => {
    if (!isDemo()) return;
    let live = true;
    import("./demoSeed").then(({ ensureDemo }) =>
      ensureDemo(locale).then(() => {
        if (live) setReady(true);
      }),
    );
    return () => {
      live = false;
    };
  }, [locale]);

  useEffect(() => {
    // Ask the browser to keep our data even when storage runs low.
    navigator.storage?.persist?.().catch(() => {});
    // The demo inside the product page does not install anything on the visitor's phone.
    if (!isDemo() && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/app" }).catch(() => {});
    }
    // If the browser will not open storage (some private windows, a full disk), say so
    // up front instead of showing screens that cannot save.
    void db()
      .open()
      .catch((error: unknown) => {
        const p = storageProblem(error);
        setBlocked({
          p: p === "other" ? "blocked" : p,
          detail: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 160) : "",
        });
      });
  }, []);

  return (
    <div className="k-app" data-top={top} data-onb={onb}>
      <DemoBanner />
      <UpdateBanner />
      {blocked ? (
        <ScreenProblem
          problem={blocked.p === "quota" ? "quota" : "blocked"}
          detail={blocked.detail}
          onRetry={() => location.reload()}
        />
      ) : ready ? (
        <PinGate>
          <FirstRun />
          <div className="k-frame">
            {onb ? null : <TabBar />}
            <div className="k-stage">
              {top ? <DeskBar /> : null}
              <ScreenBoundary resetKey={route.join("/")}>
                <Suspense fallback={<Loading />}>
                  <Screens />
                </Suspense>
              </ScreenBoundary>
              <UndoBar />
            </div>
          </div>
        </PinGate>
      ) : (
        <Loading />
      )}
    </div>
  );
}

export default function AppRoot() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
