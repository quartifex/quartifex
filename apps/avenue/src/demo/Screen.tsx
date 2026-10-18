"use client";
// One seat's screen, laid out like a production Android Automotive cabin: a status bar, a rail
// of apps with icons and names down the left, the app, and a taskbar along the bottom with
// pinned apps, the media that is playing (with full transport) and this zone's climate, sound
// and SOS. A notification shade slides in from the left with quick settings: connections, cast,
// do not disturb, light or dark, an accent colour, brightness, and the screen's display modes
// (off, a clock, a slideshow). Overlays can arrive from elsewhere in the car: a share waiting
// for a yes, the SOS countdown. The driver's screen reshapes while moving.
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MODULE_BY_ID, type ModuleId } from "@/content/modules";
import { embed, MIXES, thumb, VIDEO_BY_ID, VIDEOS } from "@/content/youtube";
import { Apps, Cast, Store, StoreApp, YouTube, YtMusic } from "./apps";
import s from "./cabin.module.css";
import { Icon, type IconName } from "./Icon";
import { Climate, Clips, Home, Journey, Media, Routines, Settings, useClock } from "./modules";
import { dispatch, useSystem } from "./store";
import {
  ACCENTS,
  type AccentId,
  canOpen,
  canPlay,
  type DisplayMode,
  JOURNEY,
  LIBRARY,
  MEDIA_BY_ID,
  notifications,
  SEAT_NAME,
  type SeatId,
  VEHICLE,
} from "./system";
import { Art, IconButton, Press, Range } from "./ui";

const ICON: Record<ModuleId, IconName> = {
  home: "home",
  apps: "apps",
  media: "media",
  journey: "journey",
  climate: "climate",
  routines: "routines",
  clips: "clips",
  settings: "settings",
  youtube: "youtube",
  ytmusic: "ytmusic",
  store: "store",
  cast: "cast",
  app: "apps",
};

const LABEL: Partial<Record<ModuleId, string>> = {
  journey: "Maps",
  ytmusic: "YT Music",
  apps: "All apps",
  store: "Play Store",
};

const VIEWS: Record<ModuleId, (p: { seat: SeatId }) => React.ReactNode> = {
  home: Home,
  apps: Apps,
  media: Media,
  journey: Journey,
  climate: Climate,
  routines: Routines,
  clips: Clips,
  settings: Settings,
  youtube: YouTube,
  ytmusic: YtMusic,
  store: Store,
  cast: Cast,
  app: StoreApp,
};

/** The rail, per seat: the driver gets the few things that matter on the move. */
const RAIL: Record<"driver" | "copilot" | "rear", ModuleId[]> = {
  driver: ["home", "journey", "media", "ytmusic", "climate", "settings", "apps"],
  copilot: ["home", "journey", "media", "youtube", "ytmusic", "climate", "routines", "apps"],
  rear: ["home", "media", "youtube", "ytmusic", "journey", "climate", "cast", "apps"],
};

/** Pinned on the taskbar. */
const PINNED: Record<"driver" | "copilot" | "rear", ModuleId[]> = {
  driver: ["journey", "ytmusic"],
  copilot: ["journey", "youtube", "store"],
  rear: ["youtube", "store", "cast"],
};

const label = (id: ModuleId) => LABEL[id] ?? MODULE_BY_ID[id]?.name ?? id;
const kindOf = (seat: SeatId) =>
  seat === "driver" ? "driver" : seat === "copilot" ? "copilot" : "rear";

// ---------------------------------------------------------------- overlays from the car

function Inbox({ seat }: { seat: SeatId }) {
  const inbox = useSystem((st) => st.seats[seat].inbox);
  const dnd = useSystem((st) => st.seats[seat].dnd);
  const share = inbox[inbox.length - 1];
  if (!share || dnd) return null;
  const item = MEDIA_BY_ID[share.ref];
  return (
    <div
      className={s.toast}
      role="alertdialog"
      aria-labelledby={`inbox-${share.id}`}
      aria-modal="false"
    >
      <div className={s.toastTop}>
        {item ? <Art hue={item.hue} seed={item.seed} className={s.thumb} /> : <Icon name="inbox" />}
        <p id={`inbox-${share.id}`}>
          <span className={s.kicker}>From {SEAT_NAME[share.from].toLowerCase()}</span>
          <strong>{share.title}</strong>
          {item ? <span className={s.muted}>{item.by}</span> : null}
        </p>
      </div>
      <div className={s.row}>
        <Press className={s.chip} onPress={() => dispatch({ type: "decline", seat, id: share.id })}>
          Not now
        </Press>
        <Press
          className={s.chip}
          variant="accent"
          sound="confirm"
          onPress={() => dispatch({ type: "accept", seat, id: share.id })}
        >
          {share.kind === "place" ? "Add to journey" : "Play here"}
        </Press>
      </div>
    </div>
  );
}

function Sos({ seat }: { seat: SeatId }) {
  const sos = useSystem((st) => st.sos);
  useEffect(() => {
    if (sos.state !== "counting") return;
    const id = window.setTimeout(() => dispatch({ type: "sos-tick" }), 1000);
    return () => window.clearTimeout(id);
  }, [sos]);
  if (sos.state === "idle") return null;
  const from = sos.from ? SEAT_NAME[sos.from].toLowerCase() : "";
  return (
    <div
      className={s.sos}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`sos-${seat}`}
      aria-describedby={`sos-${seat}-d`}
    >
      <p id={`sos-${seat}`} className={s.sosTitle}>
        {sos.state === "calling" ? "Calling emergency services" : "Emergency call"}
      </p>
      <p className={s.sosCount} aria-hidden="true">
        {sos.state === "counting" ? sos.remaining : <Icon name="sos" />}
      </p>
      <p id={`sos-${seat}-d`} className={s.sosText}>
        {sos.state === "counting"
          ? `Started from the ${from} screen. The call is placed in ${sos.remaining} seconds.`
          : "Every screen shows that help is on the way. This is a demo: no call is placed."}
      </p>
      <Press
        className={s.sosCancel}
        onPress={() => dispatch({ type: "sos-cancel" })}
        sound="confirm"
      >
        {sos.state === "counting" ? "Cancel" : "End"}
      </Press>
    </div>
  );
}

// ---------------------------------------------------------------- the video player

/**
 * The seat's YouTube player. One iframe per seat, so it keeps playing across apps: it docks
 * into the YouTube or YouTube Music view's slot, and floats in a corner everywhere else.
 */
function VideoPlayer({ seat, host }: { seat: SeatId; host: HTMLDivElement | null }) {
  const video = useSystem((st) => st.seats[seat].video);
  const module = useSystem((st) => st.seats[seat].module);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const isMix = video ? MIXES.some((m) => m.id === video) : false;
  // Docked in YouTube, and in YouTube Music when what is playing is a mix; a corner elsewhere.
  const docked = module === "youtube" || (module === "ytmusic" && isMix);

  useLayoutEffect(() => {
    if (!host || !video || !docked) {
      setBox(null);
      return;
    }
    const main = host.querySelector<HTMLElement>("main");
    const measure = () => {
      const slot = host.querySelector<HTMLElement>("[data-player-slot]");
      if (!slot) return setBox(null);
      const a = host.getBoundingClientRect();
      const b = slot.getBoundingClientRect();
      setBox({ x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    main?.addEventListener("scroll", measure, { passive: true });
    const t = window.setTimeout(measure, 80);
    return () => {
      ro.disconnect();
      main?.removeEventListener("scroll", measure);
      window.clearTimeout(t);
    };
  }, [host, video, docked]);

  if (!video) return null;
  const v = VIDEO_BY_ID[video];
  return (
    <div
      className={s.player}
      data-docked={docked && box ? "" : undefined}
      style={
        docked && box
          ? ({
              "--px": `${box.x}px`,
              "--py": `${box.y}px`,
              "--pw": `${box.w}px`,
              "--ph": `${box.h}px`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <iframe
        key={video}
        src={embed(video)}
        title={v ? `YouTube: ${v.title}` : "YouTube video"}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
      {docked ? null : (
        <span className={s.playerBar}>
          <Press
            className={s.playerOpen}
            label="Open the player"
            onPress={() =>
              dispatch({
                type: "open",
                seat,
                module: MIXES.some((m) => m.id === video) ? "ytmusic" : "youtube",
              })
            }
          >
            <Icon name="ar" size="1em" />
          </Press>
          <Press
            className={s.playerOpen}
            label="Stop the video"
            onPress={() => dispatch({ type: "video", seat, id: null })}
          >
            <Icon name="close" size="1em" />
          </Press>
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the taskbar

function TaskbarMedia({ seat }: { seat: SeatId }) {
  const nowPlaying = useSystem((st) => st.seats[seat].nowPlaying);
  const playing = useSystem((st) => st.seats[seat].playing);
  const progress = useSystem((st) => st.seats[seat].progress);
  const video = useSystem((st) => st.seats[seat].video);
  const state = useSystem((st) => st);

  if (video) {
    const v = VIDEO_BY_ID[video];
    const music = MIXES.some((m) => m.id === video);
    const pool = music ? MIXES : VIDEOS;
    const step = (d: number) => {
      const i = pool.findIndex((x) => x.id === video);
      const n = pool[(i + d + pool.length) % pool.length];
      if (n) dispatch({ type: "video", seat, id: n.id });
    };
    return (
      <div className={s.tbMedia}>
        {/* biome-ignore lint/performance/noImgElement: a YouTube thumbnail */}
        <img className={s.tbArt} src={thumb(video)} alt="" />
        <span className={s.tbMeta}>
          <strong>{v?.title}</strong>
          <span>
            <Icon name={music ? "ytmusic" : "youtube"} size="1em" /> {v?.channel}
          </span>
        </span>
        <span className={s.tbTransport}>
          <IconButton icon="prev" label="Previous" onPress={() => step(-1)} variant="quiet" />
          <IconButton
            icon="stop"
            label="Stop"
            onPress={() => dispatch({ type: "video", seat, id: null })}
            variant="accent"
          />
          <IconButton icon="next" label="Next" onPress={() => step(1)} variant="quiet" />
        </span>
        <span className={s.tbProgress} data-live="" aria-hidden="true" />
      </div>
    );
  }

  const item = nowPlaying ? MEDIA_BY_ID[nowPlaying] : undefined;
  if (!item)
    return (
      <div className={s.tbMedia} data-empty="">
        <span className={s.muted}>Nothing playing</span>
      </div>
    );
  const locked = !playing && !canPlay(state, seat, item) ? "available when parked" : undefined;
  const pool = LIBRARY.filter(
    (m) => m.kind === item.kind && (item.station ? m.station === item.station : true),
  );
  const step = (d: number) => {
    const i = pool.findIndex((m) => m.id === item.id);
    const n = pool[(i + d + pool.length) % pool.length];
    if (n && n.id !== item.id) dispatch({ type: "play", seat, id: n.id });
    else dispatch({ type: "seek", seat, to: 0 });
  };
  return (
    <div className={s.tbMedia}>
      <Art hue={item.hue} seed={item.seed} className={s.tbArt} />
      <span className={s.tbMeta}>
        <strong>{item.title}</strong>
        <span>{item.by}</span>
      </span>
      <span className={s.tbTransport}>
        <IconButton icon="prev" label="Previous" onPress={() => step(-1)} variant="quiet" />
        <IconButton
          icon={playing ? "pause" : "play"}
          label={playing ? `Pause ${item.title}` : `Play ${item.title}`}
          onPress={() => dispatch({ type: "toggle-play", seat })}
          {...(locked ? { locked } : {})}
          variant="accent"
          filled={!playing}
        />
        <IconButton icon="next" label="Next" onPress={() => step(1)} variant="quiet" />
      </span>
      <span
        className={s.tbProgress}
        aria-hidden="true"
        style={{ "--p": `${Math.round(progress * 100)}%` } as React.CSSProperties}
      />
    </div>
  );
}

function Taskbar({ seat, driving }: { seat: SeatId; driving: boolean }) {
  const zone = useSystem((st) => st.zones[seat]);
  const module = useSystem((st) => st.seats[seat].module);
  const sound = useSystem((st) => st.sound);
  const volume = useSystem((st) => st.volume[seat]);
  const state = useSystem((st) => st);
  const pinned = PINNED[kindOf(seat)];
  return (
    <footer className={s.taskbar}>
      <div className={s.tbApps}>
        <Press
          className={s.tbApp}
          label="All apps"
          onPress={() => dispatch({ type: "open", seat, module: "apps" })}
          {...(module === "apps" ? { "aria-current": "page" as const } : {})}
        >
          <Icon name="apps" />
        </Press>
        {driving
          ? null
          : pinned.map((id) => {
              const locked = !canOpen(state, seat, id);
              return (
                <Press
                  key={id}
                  className={s.tbApp}
                  label={label(id)}
                  onPress={() => dispatch({ type: "open", seat, module: id })}
                  {...(module === id ? { "aria-current": "page" as const } : {})}
                  {...(locked ? { locked: "available when parked" } : {})}
                >
                  <Icon name={locked ? "lock" : ICON[id]} />
                </Press>
              );
            })}
      </div>
      <TaskbarMedia seat={seat} />
      <div className={s.tbRight}>
        <div className={s.tbClimate}>
          <IconButton
            icon="minus"
            label="Cooler"
            onPress={() => dispatch({ type: "temp", seat, by: -0.5 })}
            variant="quiet"
          />
          <span className={s.dockTemp}>
            <span className="sr-only">{SEAT_NAME[seat]} zone </span>
            {zone.temp.toFixed(1)}
            <small>°</small>
          </span>
          <IconButton
            icon="plus"
            label="Warmer"
            onPress={() => dispatch({ type: "temp", seat, by: 0.5 })}
            variant="quiet"
          />
        </div>
        <span className={s.tbVolume}>
          <IconButton
            icon={sound ? "sound" : "mute"}
            label={sound ? "Sound on" : "Sound off"}
            pressed={sound}
            onPress={() => {
              if (!sound) void import("./sound").then((m) => m.enableSound());
              dispatch({ type: "sound", on: !sound });
            }}
            variant="quiet"
          />
          <span
            className={s.tbLevel}
            aria-hidden="true"
            style={{ "--v": `${Math.round(volume * 100)}%` } as React.CSSProperties}
          />
        </span>
        <IconButton
          icon="sos"
          label="Emergency SOS"
          variant="danger"
          sound="alert"
          onPress={() => dispatch({ type: "sos-start", seat })}
        />
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------- the shade

function Tile({
  icon,
  name,
  detail,
  on,
  onPress,
  locked,
}: {
  icon: IconName;
  name: string;
  detail?: string;
  on?: boolean;
  onPress: () => void;
  locked?: string;
}) {
  return (
    <Press
      className={s.qTile}
      onPress={onPress}
      {...(on === undefined ? {} : { pressed: on })}
      {...(locked ? { locked } : {})}
      label={name}
    >
      <Icon name={locked ? "lock" : icon} />
      <span>
        <strong>{name}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
    </Press>
  );
}

function Shade({ seat, onClose }: { seat: SeatId; onClose: () => void }) {
  const st = useSystem((x) => x);
  const me = st.seats[seat];
  const list = notifications(st, seat);
  const clock = useClock();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Focus moves into the shade, and back to what opened it when it closes.
    const back = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      back?.focus({ preventScroll: true });
    };
  }, [onClose]);
  const display = (to: DisplayMode) => {
    dispatch({ type: "display", seat, to });
    onClose();
  };
  const castLocked = !canOpen(st, seat, "cast") ? "available when parked" : undefined;
  return (
    <>
      <button
        type="button"
        className={s.scrim}
        aria-label="Close"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={ref}
        className={s.shade}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications and quick settings"
      >
        <div className={s.shadeHead}>
          <span>
            <strong className={s.shadeTime}>{clock}</strong>
            <small>{SEAT_NAME[seat]} screen</small>
          </span>
          <IconButton icon="close" label="Close" onPress={onClose} variant="quiet" />
        </div>

        <div className={s.qGrid}>
          <Tile
            icon="wifi"
            name="Wi‑Fi"
            detail={st.settings.wifi ? "Car hotspot" : "Off"}
            on={st.settings.wifi}
            onPress={() => dispatch({ type: "setting", key: "wifi", on: !st.settings.wifi })}
          />
          <Tile
            icon="bluetooth"
            name="Bluetooth"
            detail={st.settings.bluetooth ? "Pixel 9" : "Off"}
            on={st.settings.bluetooth}
            onPress={() =>
              dispatch({ type: "setting", key: "bluetooth", on: !st.settings.bluetooth })
            }
          />
          <Tile
            icon="cast"
            name="Cast"
            detail={st.cast.seat === seat ? "Casting" : "From a phone"}
            on={st.cast.seat === seat}
            onPress={() => {
              dispatch({ type: "open", seat, module: "cast" });
              onClose();
            }}
            {...(castLocked ? { locked: castLocked } : {})}
          />
          <Tile
            icon="dnd"
            name="Do not disturb"
            detail={me.dnd ? "On" : "Off"}
            on={me.dnd}
            onPress={() => dispatch({ type: "dnd", seat, on: !me.dnd })}
          />
          <Tile
            icon={me.theme === "dark" ? "moon" : "sun"}
            name={me.theme === "dark" ? "Dark" : "Light"}
            detail="Theme"
            on={me.theme === "light"}
            onPress={() =>
              dispatch({ type: "theme", seat, to: me.theme === "dark" ? "light" : "dark" })
            }
          />
          <Tile
            icon="power"
            name="Screen off"
            detail="Tap to wake"
            onPress={() => display("off")}
          />
          <Tile icon="clock" name="Clock" detail="Ambient" onPress={() => display("clock")} />
          <Tile
            icon="image"
            name="Slideshow"
            detail="Photos and route"
            onPress={() => display("slideshow")}
          />
        </div>

        <Range
          label="Brightness"
          min={0.2}
          max={1}
          step={0.05}
          value={me.brightness}
          onChange={(to) => dispatch({ type: "brightness", seat, to })}
          format={(v) => `${Math.round(v * 100)}%`}
        />

        <div className={s.accents} role="radiogroup" aria-label="Accent colour">
          <span className={s.cardTitle}>
            <Icon name="palette" size="1.1em" /> Accent
          </span>
          {ACCENTS.map((a) => (
            // biome-ignore lint/a11y/useSemanticElements: colour swatches as a radio group
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={me.accent === a.id}
              aria-label={a.name}
              className={s.swatch}
              style={{ "--c": a.value } as React.CSSProperties}
              onClick={() => dispatch({ type: "accent", seat, to: a.id as AccentId })}
            />
          ))}
        </div>

        <div className={s.nList}>
          <div className={s.nHead}>
            <span className={s.cardTitle}>Notifications</span>
            {list.length ? (
              <Press
                className={s.textButton}
                onPress={() => {
                  for (const n of list) dispatch({ type: "dismiss", id: n.id });
                }}
              >
                Clear all
              </Press>
            ) : null}
          </div>
          {list.length ? (
            <ul>
              {list.map((n) => (
                <li key={n.id} className={s.nItem}>
                  <Icon name={n.icon} />
                  <span>
                    <strong>{n.title}</strong>
                    <small>{n.body}</small>
                  </span>
                  <IconButton
                    icon="close"
                    label={`Dismiss ${n.title}`}
                    onPress={() => dispatch({ type: "dismiss", id: n.id })}
                    variant="quiet"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.muted}>You are all caught up.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- display modes

const SLIDES = ["/media/maps/ar-coastal.webp", "/media/maps/mumbai-route.webp"];

function Display({ seat, mode }: { seat: SeatId; mode: Exclude<DisplayMode, "on"> }) {
  const clock = useClock();
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }));
  }, []);
  return (
    <button
      type="button"
      className={s.display}
      data-mode={mode}
      onClick={() => dispatch({ type: "display", seat, to: "on" })}
      aria-label="Wake the screen"
    >
      {mode === "slideshow" ? (
        <span className={s.slides} aria-hidden="true">
          {SLIDES.map((src, i) => (
            // biome-ignore lint/performance/noImgElement: static frames, sized by CSS
            <img key={src} src={src} alt="" style={{ "--i": i } as React.CSSProperties} />
          ))}
          <Art hue={265} seed={4} className={s.slideArt} />
        </span>
      ) : null}
      {mode === "off" ? (
        <span className={s.wake}>Tap to wake</span>
      ) : (
        <span className={s.ambient}>
          <strong>{clock}</strong>
          <span>{date}</span>
          <span className={s.ambientRow}>
            <Icon name="journey" size="1em" /> {JOURNEY.to} at {JOURNEY.arrive}
            <span aria-hidden="true">·</span>
            {VEHICLE.outside}° outside
          </span>
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------- touch

const ripples = { n: 0 };

/** A soft ring where a finger lands, as on a real touch screen. */
function useRipples() {
  const [list, setList] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    ripples.n += 1;
    const id = ripples.n;
    setList((l) => [...l.slice(-3), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    window.setTimeout(() => setList((l) => l.filter((p) => p.id !== id)), 650);
  }, []);
  return { list, onPointerDown };
}

// ---------------------------------------------------------------- the screen

export function Screen({ seat }: { seat: SeatId }) {
  const module = useSystem((st) => st.seats[seat].module);
  const moving = useSystem((st) => st.moving);
  const me = useSystem((st) => st.seats[seat]);
  const highContrast = useSystem((st) => st.settings.highContrast);
  const shield = useSystem((st) => st.shield);
  const fleet = useSystem((st) => st.fleet);
  const sos = useSystem((st) => st.sos.state);
  const count = useSystem((st) => notifications(st, seat).length);
  const state = useSystem((st) => st);
  const clock = useClock();
  const [shade, setShade] = useState(false);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const { list: rip, onPointerDown } = useRipples();
  const driving = seat === "driver" && moving;
  const rear = seat === "rearLeft" || seat === "rearRight";
  const View = VIEWS[module];
  const accent = ACCENTS.find((a) => a.id === me.accent)?.value ?? "#2d63ee";
  const close = useCallback(() => setShade(false), []);
  const rail = RAIL[kindOf(seat)];
  const railActive = rail.includes(module) ? module : module === "app" ? "apps" : module;

  return (
    <div
      ref={setHost}
      className={s.os}
      data-seat={seat}
      data-theme={me.theme}
      data-driving={driving ? "" : undefined}
      data-contrast={highContrast ? "high" : undefined}
      style={
        {
          "--ts": me.textScale,
          "--br": me.brightness,
          "--k-accent": accent,
          "--k-accent-2": `color-mix(in oklab, ${accent} 78%, white)`,
        } as React.CSSProperties
      }
      onPointerDown={onPointerDown}
    >
      <header className={s.status}>
        <span className={s.statusLeft}>
          <Press
            className={s.shadeButton}
            label={`Notifications and quick settings, ${count} new`}
            onPress={() => setShade(true)}
            {...(shade ? { "aria-current": "true" as const } : {})}
          >
            <Icon name="bell" size="1.2em" />
            {count && !me.dnd ? <span className={s.count}>{count}</span> : null}
            {me.dnd ? <Icon name="dnd" size="1em" /> : null}
          </Press>
          <span className={s.seatName}>
            <Icon name={seat === "driver" ? "car" : "seat"} size="1.2em" />
            {SEAT_NAME[seat]}
          </span>
          {driving ? (
            <span className={s.badge} data-tone="ember">
              <Icon name="eye" size="1.1em" />
              Moving: glance mode
            </span>
          ) : seat === "copilot" && moving ? (
            <span className={s.badge} data-tone={shield ? "ok" : undefined}>
              <Icon name={shield ? "shield" : "eyeOff"} size="1.05em" />
              {shield ? "Privacy shield on" : "Shield off"}
            </span>
          ) : rear && fleet ? (
            <span className={s.badge} data-tone="accent">
              Cab ride
            </span>
          ) : null}
        </span>
        <span className={s.statusMid}>
          <Icon name="journey" size="1.1em" />
          <strong>{JOURNEY.to}</strong> {JOURNEY.etaMinutes} min
        </span>
        <span className={s.statusRight}>
          {state.cast.seat === seat ? <Icon name="cast" size="1.1em" /> : null}
          <span>{VEHICLE.outside}°</span>
          {state.settings.wifi ? <Icon name="wifi" size="1.1em" /> : null}
          {state.settings.bluetooth ? <Icon name="bluetooth" size="1.1em" /> : null}
          <time className={s.clock}>{clock}</time>
        </span>
      </header>

      <nav className={s.rail} aria-label={`${SEAT_NAME[seat]} screen`}>
        {rail.map((id) => {
          const locked = !canOpen(state, seat, id);
          return (
            <Press
              key={id}
              className={s.railItem}
              onPress={() => dispatch({ type: "open", seat, module: id })}
              {...(railActive === id ? { "aria-current": "page" as const } : {})}
              {...(locked ? { locked: "available when parked" } : {})}
              label={label(id)}
            >
              <Icon name={locked ? "lock" : ICON[id]} filled={false} />
              <span className={s.railLabel}>{label(id)}</span>
            </Press>
          );
        })}
      </nav>

      <main className={s.main} aria-label={label(module)} key={`${seat}-${module}`}>
        <View seat={seat} />
      </main>

      <Taskbar seat={seat} driving={driving} />

      <VideoPlayer seat={seat} host={host} />
      <Inbox seat={seat} />
      {shade ? <Shade seat={seat} onClose={close} /> : null}
      {me.display !== "on" ? <Display seat={seat} mode={me.display} /> : null}
      {sos !== "idle" ? <Sos seat={seat} /> : null}
      <span className={s.ripples} aria-hidden="true">
        {rip.map((r) => (
          <i key={r.id} style={{ left: r.x, top: r.y }} />
        ))}
      </span>
    </div>
  );
}
