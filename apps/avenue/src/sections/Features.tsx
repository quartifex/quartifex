"use client";
// The feature chapters, A1 to A6: one screen each, over the moving camera. The words sit on a
// glass panel with the requirement IDs they rest on; two short notes sit along the bottom; a
// live part acts the feature out when the chapter becomes active (the driver's screen locking,
// a film travelling to the back, the four zones, places over the road, the SOS count).
import { FEATURES, type Feature, STATUS_LABEL } from "@/content/features";
import s from "./chapters.module.css";

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
      <ul
        className={s.zones}
        aria-label="Four climate zones, one per seat"
        data-anim="right"
        style={{ "--d": 3 } as React.CSSProperties}
      >
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
        <span
          className={s.poi}
          style={{ left: "76%", top: "38%", "--d": 3 } as React.CSSProperties}
          data-anim
        >
          <b>Charging, 6 bays</b>
          <small>1.2 km · on route</small>
        </span>
        <span
          className={s.poi}
          style={{ left: "58%", top: "46%", "--d": 4 } as React.CSSProperties}
          data-anim
        >
          <b>Café Lumen</b>
          <small>300 m · café</small>
        </span>
        <span className={s.eta} data-anim="right" style={{ "--d": 5 } as React.CSSProperties}>
          <small>Arrive</small>
          <b>21:48</b>
          <small>33 min · 19.9 km</small>
        </span>
      </div>
    );
  if (id === "sos")
    return (
      <div
        className={s.sos}
        aria-hidden="true"
        data-anim="scale"
        style={{ "--d": 2 } as React.CSSProperties}
      >
        <span className={s.sosLabel}>Emergency SOS</span>
        <span className={s.sosCount} data-sos-count />
        <span className={s.sosCancel}>Press to cancel</span>
      </div>
    );
  return null;
}

function Chapter({ f, index }: { f: Feature; index: number }) {
  return (
    <section
      id={`ch-${f.id}`}
      data-chapter={f.id}
      data-slide
      data-snap
      className={`${s.chapter} ${s.feature}`}
      data-side={index % 2 ? "right" : "left"}
      data-moving={f.id === "driver" ? "true" : undefined}
      aria-labelledby={`${f.id}-title`}
    >
      <p className={`mega ${s.word}`} aria-hidden="true">
        {f.word}
      </p>
      <div className={`wrap ${s.featureGrid}`}>
        <header className={`${s.panel} ${s.featureHead}`} data-anim={index % 2 ? "right" : "left"}>
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
          <p className={`mono ${s.ids}`}>
            <span className="sr-only">Requirements: </span>
            {f.ids.map((id) => (
              <a key={id} href={`#req-${id}`} title={`Requirement ${id}`}>
                {id}
              </a>
            ))}
          </p>
        </header>
        <div className={s.notes}>
          {f.notes.map((n, i) => (
            <div
              key={n.head}
              className={s.note}
              data-anim
              style={{ "--d": 4 + i } as React.CSSProperties}
            >
              <span className="label">{n.head}</span>
              <p>{n.body}</p>
            </div>
          ))}
        </div>
      </div>
      <Extra id={f.id} />
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
