"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import { db, isDemo } from "../lib/db";
import { AppProvider, useApp } from "./context";
import { PinGate } from "./PinGate";
import { Home } from "./screens/Home";

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

function Screens() {
  const { route } = useApp();
  const [head, id, sub] = route;
  if (head === "new-class") return <NewClass />;
  if (head === "settings") return <Settings />;
  if (head === "class" && id) {
    if (sub === "new") return <NewTest classId={id} />;
    if (sub === "roster") return <Roster classId={id} />;
    return <ClassScreen classId={id} tab={sub ?? "tests"} />;
  }
  if (head === "test" && id) {
    if (sub === "mark") return <Mark assessmentId={id} start={route[3]} />;
    if (sub === "grid") return <Grid assessmentId={id} />;
    if (sub === "report") return <Report kind="class" id={id} />;
    return <Results assessmentId={id} />;
  }
  if (head === "student" && id) {
    if (sub === "report") return <Report kind="student" id={id} />;
    return <StudentScreen studentId={id} />;
  }
  return <Home />;
}

function DemoBanner() {
  const { t } = useApp();
  if (!isDemo()) return null;
  return (
    <div className="k-demo" role="note">
      <span>{t("demo.banner")}</span>
      <button
        type="button"
        className="k-demo__reset"
        onClick={async () => {
          const { resetDemo } = await import("./demoSeed");
          await resetDemo();
          location.hash = "#/";
          location.reload();
        }}
      >
        {t("demo.reset")}
      </button>
    </div>
  );
}

function Loading() {
  return <div aria-busy="true" style={{ minHeight: "60svh" }} />;
}

function Shell() {
  const [ready, setReady] = useState(!isDemo());
  const { locale } = useApp();

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
    void db()
      .open()
      .catch(() => {});
  }, []);

  return (
    <div className="k-app">
      <DemoBanner />
      {ready ? (
        <PinGate>
          <Suspense fallback={<Loading />}>
            <Screens />
          </Suspense>
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
