"use client";
// The feature chapters, A1 to A6: the scrollytelling. Each one pins for about two screens
// while the camera moves through the car (stage/camera.ts); the words hold still on a
// sticky frame, with two short notes either side, the requirement IDs it rests on, and an
// honest research status. Some chapters carry a live part: the driver's Parked / Moving state,
// a film travelling to the back, the four climate zones, places over the road, the SOS count.
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { FEATURES, type Feature, STATUS_LABEL } from "@/content/features";
import s from "./chapters.module.css";

function SosCount() {
  const el = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(5);
  useEffect(() => {
    const section = el.current?.closest("section");
    if (!section) return;
    const st = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom bottom",
      onUpdate: (self) =>
        setN(Math.max(1, 5 - Math.floor(Math.max(0, self.progress - 0.25) / 0.13))),
    });
    return () => st.kill();
  }, []);
  return (
    <div className={s.sos} aria-hidden="true">
      <span className={s.sosLabel}>Emergency SOS</span>
      <span ref={el} className={s.sosCount}>
        {n}
      </span>
      <span className={s.sosCancel}>Press to cancel</span>
    </div>
  );
}

function Extra({ id }: { id: string }) {
  if (id === "driver")
    return (
      <div className={s.drive} aria-hidden="true">
        <span data-state="parked">Parked</span>
        <span data-state="moving">Moving · glance mode</span>
      </div>
    );
  if (id === "share")
    return (
      <div className={s.share} aria-hidden="true">
        <div className={s.shareCard}>
          <span className={s.shareArt} />
          <span>
            <b>Northbound</b>
            <small>From co-pilot · Film, 1 h 52</small>
          </span>
        </div>
        <div className={s.shareActions}>
          <span>Not now</span>
          <span data-primary>Play here</span>
        </div>
      </div>
    );
  if (id === "climate")
    return (
      <ul className={s.zones} aria-label="Four climate zones, one per seat">
        {[
          ["Driver", "20.5°"],
          ["Co-pilot", "22°"],
          ["Rear left", "21°"],
          ["Rear right", "23.5°"],
        ].map(([seat, t]) => (
          <li key={seat}>
            <span className="label">{seat}</span>
            <span className={s.zoneTemp}>{t}</span>
          </li>
        ))}
      </ul>
    );
  if (id === "road")
    return (
      <div className={s.ar} aria-hidden="true">
        <span className={s.poi} style={{ left: "58%", top: "44%" }}>
          <b>Charging, 4 bays</b>
          <small>1.2 km · on route</small>
        </span>
        <span className={s.poi} style={{ left: "36%", top: "50%" }}>
          <b>The Long Table</b>
          <small>600 m · café</small>
        </span>
        <span className={s.eta}>
          <small>ETA</small>
          <b>21:48</b>
          <small>38 min · 41 km</small>
        </span>
      </div>
    );
  if (id === "sos") return <SosCount />;
  return null;
}

function Chapter({ f, index }: { f: Feature; index: number }) {
  return (
    <section
      id={`ch-${f.id}`}
      data-chapter={f.id}
      data-progress
      className={`${s.chapter} ${s.feature}`}
      data-side={index % 2 ? "right" : "left"}
      data-moving={f.id === "driver" ? "false" : undefined}
      aria-labelledby={`${f.id}-title`}
    >
      <div className={s.sticky}>
        <p className={`mega ${s.word}`} aria-hidden="true">
          {f.word}
        </p>
        <div className={`wrap ${s.featureGrid}`}>
          <header className={s.featureHead}>
            <div className={s.featureMeta}>
              <span className="eyebrow">{f.coord}</span>
              <span className="tag" data-status={f.status}>
                {STATUS_LABEL[f.status]}
              </span>
            </div>
            <h2 id={`${f.id}-title`} className="h1" data-split>
              {f.title} <span className="muted">{f.muted}</span>
            </h2>
            <p className="lede">{f.lede}</p>
          </header>
          <div className={s.notes}>
            {f.notes.map((n, i) => (
              <div key={n.head} className={s.note} style={{ "--n": i } as React.CSSProperties}>
                <span className="label">{n.head}</span>
                <p>{n.body}</p>
              </div>
            ))}
          </div>
          <p className={`mono ${s.ids}`}>
            <span className="sr-only">Requirements: </span>
            {f.ids.map((id) => (
              <a key={id} href={`#req-${id}`} title={`Requirement ${id}`}>
                {id}
              </a>
            ))}
          </p>
        </div>
        <Extra id={f.id} />
      </div>
    </section>
  );
}

export function Features() {
  return (
    <div id="features">
      {FEATURES.map((f, i) => (
        <Chapter key={f.id} f={f} index={i} />
      ))}
    </div>
  );
}
