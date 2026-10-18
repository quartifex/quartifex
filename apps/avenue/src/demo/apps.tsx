"use client";
// The seat screen's apps beyond the core modules: the launcher, YouTube, YouTube Music, the
// Play Store with apps a seat can install, casting from a phone, and a store app running.
// YouTube and YouTube Music play real videos in YouTube's own embedded player; the player
// itself lives in Screen.tsx (VideoPlayer) so it keeps playing when the seat opens another
// app, shrinking to a corner. Every driving rule still comes from system.ts.
import { useEffect, useState } from "react";
import type { ModuleId } from "@/content/modules";
import { MIXES, thumb, VIDEO_BY_ID, VIDEOS } from "@/content/youtube";
import s from "./cabin.module.css";
import { Icon, type IconName } from "./Icon";
import { Eq, ViewHead } from "./modules";
import { dispatch, useSystem } from "./store";
import {
  canOpen,
  registerMusicVideos,
  SEAT_NAME,
  type SeatId,
  STORE_APPS,
  type StoreAppId,
} from "./system";
import { Card, Press } from "./ui";

registerMusicVideos(MIXES.map((m) => m.id));

/** The apps a seat can open, in launcher order. */
export const LAUNCHER: ReadonlyArray<{ id: ModuleId; name: string; icon: IconName; hue: number }> =
  [
    { id: "home", name: "Home", icon: "home", hue: 220 },
    { id: "journey", name: "Maps", icon: "journey", hue: 150 },
    { id: "media", name: "Media", icon: "media", hue: 260 },
    { id: "ytmusic", name: "YT Music", icon: "ytmusic", hue: 355 },
    { id: "youtube", name: "YouTube", icon: "youtube", hue: 5 },
    { id: "climate", name: "Climate", icon: "climate", hue: 195 },
    { id: "routines", name: "Routines", icon: "routines", hue: 40 },
    { id: "clips", name: "Clips", icon: "clips", hue: 300 },
    { id: "cast", name: "Cast", icon: "cast", hue: 230 },
    { id: "store", name: "Play Store", icon: "store", hue: 135 },
    { id: "settings", name: "Settings", icon: "settings", hue: 215 },
  ];

function AppIcon({ icon, hue, size = "3.4em" }: { icon: IconName; hue: number; size?: string }) {
  return (
    <span
      className={s.appIcon}
      style={{ "--h": hue, "--size": size } as React.CSSProperties}
      aria-hidden="true"
    >
      <Icon name={icon} />
    </span>
  );
}

// ---------------------------------------------------------------- launcher

export function Apps({ seat }: { seat: SeatId }) {
  const state = useSystem((st) => st);
  const installed = useSystem((st) => st.installed);
  return (
    <div className={s.view}>
      <ViewHead title="All apps">
        <span className={s.muted}>{SEAT_NAME[seat]} screen</span>
      </ViewHead>
      <ul className={s.launcher}>
        {LAUNCHER.map((a) => {
          const locked = !canOpen(state, seat, a.id);
          return (
            <li key={a.id}>
              <Press
                className={s.launch}
                onPress={() => dispatch({ type: "open", seat, module: a.id })}
                {...(locked ? { locked: "available when parked" } : {})}
                label={a.name}
              >
                <AppIcon icon={locked ? "lock" : a.icon} hue={a.hue} />
                <span>{a.name}</span>
              </Press>
            </li>
          );
        })}
        {STORE_APPS.filter((a) => installed.includes(a.id)).map((a) => {
          const locked = !canOpen(state, seat, "app");
          return (
            <li key={a.id}>
              <Press
                className={s.launch}
                onPress={() => dispatch({ type: "open-app", seat, id: a.id })}
                {...(locked ? { locked: "available when parked" } : {})}
                label={a.name}
              >
                <AppIcon icon={locked ? "lock" : (a.icon as IconName)} hue={a.hue} />
                <span>{a.name}</span>
              </Press>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- YouTube

/** Where the seat's video player docks inside a view; the player itself is in Screen. */
function PlayerSlot({ seat, music }: { seat: SeatId; music?: boolean }) {
  const video = useSystem((st) => st.seats[seat].video);
  const own = video && (!music || MIXES.some((m) => m.id === video));
  const v = own && video ? VIDEO_BY_ID[video] : undefined;
  return (
    <div className={s.playerSlot} data-music={music ? "" : undefined} data-player-slot>
      {v ? null : (
        <p className={s.playerEmpty}>
          <Icon name={music ? "ytmusic" : "youtube"} size="2.4em" />
          <span>{music ? "Pick a mix to start the music." : "Pick a video to play it here."}</span>
        </p>
      )}
    </div>
  );
}

export function YouTube({ seat }: { seat: SeatId }) {
  const video = useSystem((st) => st.seats[seat].video);
  const [topic, setTopic] = useState("All");
  const topics = ["All", "Drives", "Night", "Food"];
  const list = VIDEOS.filter((v) => {
    if (topic === "All") return true;
    if (topic === "Food") return /food|dish/i.test(v.title);
    if (topic === "Night") return /night|dark|blue hour/i.test(v.title);
    return /drive|driving/i.test(v.title);
  });
  const current = video ? VIDEO_BY_ID[video] : undefined;
  return (
    <div className={`${s.view} ${s.yt}`}>
      <ViewHead
        title={
          <span className={s.ytBrand}>
            <Icon name="youtube" filled /> YouTube
          </span>
        }
      >
        <div className={s.chips}>
          {topics.map((t) => (
            <Press
              key={t}
              className={s.chip}
              pressed={t === topic}
              onPress={() => setTopic(t)}
              {...(t === topic ? { variant: "accent" as const } : {})}
            >
              {t}
            </Press>
          ))}
        </div>
      </ViewHead>
      <div className={s.ytBody}>
        <div className={s.ytMain}>
          <PlayerSlot seat={seat} />
          {current ? (
            <div className={s.ytNow}>
              <p className={s.nowTitle}>{current.title}</p>
              <p className={s.muted}>{current.channel}</p>
            </div>
          ) : null}
        </div>
        <ul className={s.ytList} aria-label="Videos">
          {list.map((v) => (
            <li key={v.id}>
              <Press
                className={s.ytItem}
                onPress={() => dispatch({ type: "video", seat, id: v.id })}
                {...(v.id === video ? { "aria-current": "true" as const } : {})}
                label={`Play ${v.title}`}
              >
                {/* biome-ignore lint/performance/noImgElement: remote thumbnails and static frames, sized by CSS */}
                <img src={thumb(v.id)} alt="" loading="lazy" decoding="async" />
                <span>
                  <strong>{v.title}</strong>
                  <small>{v.channel}</small>
                </span>
              </Press>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function YtMusic({ seat }: { seat: SeatId }) {
  const video = useSystem((st) => st.seats[seat].video);
  const current = video ? MIXES.find((m) => m.id === video) : undefined;
  return (
    <div className={`${s.view} ${s.yt}`}>
      <ViewHead
        title={
          <span className={s.ytBrand}>
            <Icon name="ytmusic" /> YouTube Music
          </span>
        }
      >
        <span className={s.muted}>Mixes for the drive</span>
      </ViewHead>
      <div className={s.ytBody}>
        <div className={s.ytMain}>
          <PlayerSlot seat={seat} music />
          {current ? (
            <div className={s.ytNow}>
              <p className={s.kicker}>
                Now playing <Eq />
              </p>
              <p className={s.nowTitle}>{current.title}</p>
              <p className={s.muted}>
                {current.channel}
                {current.live ? " · Live" : ""}
              </p>
            </div>
          ) : null}
        </div>
        <ul className={s.mixGrid} aria-label="Mixes">
          {MIXES.map((m) => (
            <li key={m.id}>
              <Press
                className={s.mix}
                onPress={() => dispatch({ type: "video", seat, id: m.id })}
                {...(m.id === video ? { "aria-current": "true" as const } : {})}
                label={`Play ${m.title}`}
              >
                {/* biome-ignore lint/performance/noImgElement: remote thumbnails and static frames, sized by CSS */}
                <img src={thumb(m.id)} alt="" loading="lazy" decoding="async" />
                <span className={s.mixMood}>
                  {m.mood}
                  {m.live ? <em>Live</em> : null}
                </span>
                <strong>{m.title}</strong>
                <small>{m.channel}</small>
              </Press>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Play Store

export function Store({ seat }: { seat: SeatId }) {
  const installed = useSystem((st) => st.installed);
  const [busy, setBusy] = useState<StoreAppId | null>(null);
  useEffect(() => {
    if (!busy) return;
    const id = window.setTimeout(() => {
      dispatch({ type: "install", id: busy });
      setBusy(null);
    }, 1400);
    return () => window.clearTimeout(id);
  }, [busy]);
  return (
    <div className={s.view}>
      <ViewHead
        title={
          <span className={s.ytBrand}>
            <Icon name="store" /> Play Store
          </span>
        }
      >
        <span className={s.muted}>Apps approved for the car</span>
      </ViewHead>
      <ul className={s.storeList}>
        {STORE_APPS.map((a) => {
          const has = installed.includes(a.id);
          const installing = busy === a.id;
          return (
            <li key={a.id} className={s.storeItem}>
              <AppIcon icon={a.icon as IconName} hue={a.hue} />
              <span className={s.storeText}>
                <strong>{a.name}</strong>
                <small>{a.what}</small>
                <span className={s.storeMeta}>Made for cars · Parked and moving: passengers</span>
              </span>
              {has ? (
                <span className={s.row}>
                  <Press
                    className={s.chip}
                    onPress={() => dispatch({ type: "uninstall", id: a.id })}
                    label={`Uninstall ${a.name}`}
                  >
                    Remove
                  </Press>
                  <Press
                    className={s.chip}
                    variant="accent"
                    onPress={() => dispatch({ type: "open-app", seat, id: a.id })}
                  >
                    Open
                  </Press>
                </span>
              ) : (
                <Press
                  className={s.chip}
                  variant="accent"
                  sound="confirm"
                  disabled={installing}
                  onPress={() => setBusy(a.id)}
                  label={`Install ${a.name}`}
                >
                  {installing ? (
                    <>
                      <span className={s.spinner} aria-hidden="true" /> Installing
                    </>
                  ) : (
                    <>
                      <Icon name="download" size="1.1em" /> Install
                    </>
                  )}
                </Press>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- Cast

const CAST_SLIDES = ["/media/maps/ar-coastal.webp", "/media/maps/mumbai-route.webp"];

export function Cast({ seat }: { seat: SeatId }) {
  const cast = useSystem((st) => st.cast);
  const here = cast.seat === seat;
  const elsewhere = cast.seat && !here ? cast.seat : null;
  useEffect(() => {
    if (!(here && cast.state === "pairing")) return;
    const id = window.setTimeout(() => dispatch({ type: "cast", seat, to: "casting" }), 2200);
    return () => window.clearTimeout(id);
  }, [here, cast.state, seat]);
  return (
    <div className={s.view}>
      <ViewHead
        title={
          <span className={s.ytBrand}>
            <Icon name="cast" /> Cast
          </span>
        }
      >
        <span className={s.muted}>From a phone to this screen</span>
      </ViewHead>
      {here && cast.state === "casting" ? (
        <div className={s.castLive}>
          <div className={s.castFrame}>
            {CAST_SLIDES.map((src, i) => (
              // biome-ignore lint/performance/noImgElement: static frames, sized by CSS
              <img key={src} src={src} alt="" style={{ "--i": i } as React.CSSProperties} />
            ))}
            <span className={s.castBadge}>
              <Icon name="cast" size="1em" /> {cast.device}
            </span>
          </div>
          <Press
            className={s.chip}
            onPress={() => dispatch({ type: "cast", seat, to: "idle" })}
            variant="danger"
          >
            Stop casting
          </Press>
        </div>
      ) : here && cast.state === "pairing" ? (
        <Card title="Pairing">
          <p className={s.castCode}>
            <span className="sr-only">Code 4 8 1 7</span>
            <span>4</span>
            <span>8</span>
            <span>1</span>
            <span>7</span>
          </p>
          <p className={s.muted}>Check that {cast.device} shows the same code, then accept.</p>
          <Press className={s.chip} onPress={() => dispatch({ type: "cast", seat, to: "idle" })}>
            Cancel
          </Press>
        </Card>
      ) : (
        <div className={s.castGrid}>
          <Card title="Nearby">
            <div className={s.castDevice}>
              <Icon name="phone" size="2em" />
              <span>
                <strong>{cast.device}</strong>
                <small>
                  {elsewhere
                    ? `Casting to the ${SEAT_NAME[elsewhere].toLowerCase()} screen`
                    : "On the car's Wi‑Fi"}
                </small>
              </span>
              <Press
                className={s.chip}
                variant="accent"
                onPress={() => dispatch({ type: "cast", seat, to: "pairing" })}
              >
                {elsewhere ? "Move here" : "Cast here"}
              </Press>
            </div>
          </Card>
          <Card title="How it works">
            <ol className={s.steps}>
              <li>Join the car's Wi‑Fi on the phone.</li>
              <li>Pick this seat from the phone's cast menu, or press Cast here.</li>
              <li>Match the four-digit code. The pairing is kept for next time.</li>
            </ol>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- a store app

const APP_ROWS: Record<StoreAppId, Array<[string, string]>> = {
  parkwise: [
    ["Colaba Causeway car park", "200 m from the destination · ₹60/h · 14 free"],
    ["Regal Circle, street parking", "350 m · ₹40/h · pay in the app"],
    ["Apollo Bunder", "600 m · ₹50/h · covered"],
  ],
  plugmap: [
    ["Coastal Road hub", "1.2 km · on route · 6 of 8 free · 120 kW"],
    ["Worli Sea Face", "3.8 km · 2 of 4 free · 60 kW"],
    ["Nariman Point", "at destination · 3 of 6 free · 50 kW"],
  ],
  tidepool: [
    ["The Mumbai Story, episode 4", "41 min · downloaded"],
    ["Slow Roads", "28 min · downloaded"],
    ["City of Seven Islands, audiobook", "6 h 12 · chapter 3"],
  ],
  storytime: [
    ["The Lighthouse Cat", "8 min · read along"],
    ["Rani and the Monsoon", "12 min · read along"],
    ["Ten Little Boats", "5 min · counting"],
  ],
  wordquest: [
    ["Today's puzzle", "Rear left and rear right, together"],
    ["Quick round", "Three minutes, one word"],
    ["Scores", "Rear left 3 · Rear right 2"],
  ],
  skyglass: [
    ["Now, Bandra West", "29° · clear · humidity 74%"],
    ["21:30, Worli", "28° · clear"],
    ["22:00, Colaba", "28° · light breeze from the sea"],
  ],
};

export function StoreApp({ seat }: { seat: SeatId }) {
  const id = useSystem((st) => st.seats[seat].app);
  const app = STORE_APPS.find((a) => a.id === id);
  if (!app) return <Apps seat={seat} />;
  return (
    <div className={s.view}>
      <div className={s.appHead} style={{ "--h": app.hue } as React.CSSProperties}>
        <Press
          className={s.iconButton}
          label="All apps"
          onPress={() => dispatch({ type: "open", seat, module: "apps" })}
          variant="quiet"
        >
          <Icon name="back" />
        </Press>
        <AppIcon icon={app.icon as IconName} hue={app.hue} size="2.8em" />
        <span>
          <strong>{app.name}</strong>
          <small>{app.what}</small>
        </span>
      </div>
      <ul className={s.appRows}>
        {APP_ROWS[app.id].map(([t, d]) => (
          <li key={t}>
            <Press className={s.appRow} onPress={() => undefined}>
              <strong>{t}</strong>
              <small>{d}</small>
              <Icon name="next" size="1em" />
            </Press>
          </li>
        ))}
      </ul>
      <p className={s.fine}>
        {app.name} is a sample app for the demo, to show how a store app runs in a seat.
      </p>
    </div>
  );
}
