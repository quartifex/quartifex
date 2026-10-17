"use client";
// One seat's screen: a status bar, the module rail, the module, and a dock along the bottom
// with this zone's temperature, what is playing and SOS, always one touch away (as production
// cars keep climate and media in a persistent bar). Overlays can arrive from elsewhere in the
// car: a share waiting for a yes, the SOS countdown. The driver's screen reshapes while moving.
import { useEffect } from "react";
import { MODULES, type ModuleId } from "@/content/modules";
import s from "./cabin.module.css";
import { Icon, type IconName } from "./Icon";
import { Climate, Clips, Home, Journey, Media, Routines, Settings, useClock } from "./modules";
import { dispatch, useSystem } from "./store";
import {
  canPlay,
  DRIVER_LOCKED_MODULES,
  JOURNEY,
  MEDIA_BY_ID,
  SEAT_NAME,
  type SeatId,
  VEHICLE,
} from "./system";
import { Art, IconButton, Press } from "./ui";

const ICON: Record<ModuleId, IconName> = {
  home: "home",
  media: "media",
  journey: "journey",
  climate: "climate",
  routines: "routines",
  clips: "clips",
  settings: "settings",
};

const VIEWS: Record<ModuleId, (p: { seat: SeatId }) => React.ReactNode> = {
  home: Home,
  media: Media,
  journey: Journey,
  climate: Climate,
  routines: Routines,
  clips: Clips,
  settings: Settings,
};

function Inbox({ seat }: { seat: SeatId }) {
  const inbox = useSystem((st) => st.seats[seat].inbox);
  const share = inbox[inbox.length - 1];
  if (!share) return null;
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

function Dock({ seat, driving }: { seat: SeatId; driving: boolean }) {
  const zone = useSystem((st) => st.zones[seat]);
  const nowPlaying = useSystem((st) => st.seats[seat].nowPlaying);
  const playing = useSystem((st) => st.seats[seat].playing);
  const sound = useSystem((st) => st.sound);
  const state = useSystem((st) => st);
  const item = nowPlaying ? MEDIA_BY_ID[nowPlaying] : undefined;
  const locked =
    item && !playing && !canPlay(state, seat, item) ? "available when parked" : undefined;
  return (
    <footer className={s.dock}>
      <div className={s.dockClimate}>
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
      {item ? (
        <div className={s.dockMedia}>
          <Art hue={item.hue} seed={item.seed} className={s.dockArt} />
          <span className={s.dockMeta}>
            <strong>{item.title}</strong>
            <span>{item.by}</span>
          </span>
          <IconButton
            icon={playing ? "pause" : "play"}
            label={playing ? `Pause ${item.title}` : `Play ${item.title}`}
            onPress={() => dispatch({ type: "toggle-play", seat })}
            {...(locked ? { locked } : {})}
            variant="accent"
            filled={!playing}
          />
        </div>
      ) : (
        <span />
      )}
      <div className={s.dockRight}>
        {driving ? null : (
          <IconButton
            icon="mic"
            label="Voice: say what you need"
            onPress={() => dispatch({ type: "open", seat, module: "journey" })}
            variant="quiet"
          />
        )}
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

export function Screen({ seat }: { seat: SeatId }) {
  const module = useSystem((st) => st.seats[seat].module);
  const moving = useSystem((st) => st.moving);
  const textScale = useSystem((st) => st.seats[seat].textScale);
  const brightness = useSystem((st) => st.seats[seat].brightness);
  const highContrast = useSystem((st) => st.settings.highContrast);
  const shield = useSystem((st) => st.shield);
  const fleet = useSystem((st) => st.fleet);
  const sos = useSystem((st) => st.sos.state);
  const clock = useClock();
  const driving = seat === "driver" && moving;
  const rear = seat === "rearLeft" || seat === "rearRight";
  const View = VIEWS[module];
  const lockedModules = driving ? DRIVER_LOCKED_MODULES : [];

  return (
    <div
      className={s.os}
      data-seat={seat}
      data-driving={driving ? "" : undefined}
      data-contrast={highContrast ? "high" : undefined}
      style={{ "--ts": textScale, "--br": brightness } as React.CSSProperties}
    >
      <header className={s.status}>
        <span className={s.statusLeft}>
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
          <span>{VEHICLE.outside}°</span>
          <Icon name="wifi" size="1.1em" />
          <Icon name="bluetooth" size="1.1em" />
          <time className={s.clock}>{clock}</time>
        </span>
      </header>

      <nav className={s.rail} aria-label={`${SEAT_NAME[seat]} screen`}>
        {MODULES.map((m) => {
          const locked = lockedModules.includes(m.id);
          return (
            <Press
              key={m.id}
              className={s.railItem}
              onPress={() => dispatch({ type: "open", seat, module: m.id })}
              {...(module === m.id ? { "aria-current": "page" as const } : {})}
              {...(locked ? { locked: "available when parked" } : {})}
              label={m.name}
            >
              <Icon name={locked ? "lock" : ICON[m.id]} filled={false} />
              <span className={s.railLabel}>
                {m.id === "climate" ? "Climate" : m.id === "clips" ? "Clips" : m.name}
              </span>
            </Press>
          );
        })}
      </nav>

      <main
        className={s.main}
        aria-label={MODULES.find((m) => m.id === module)?.name}
        key={`${seat}-${module}`}
      >
        <View seat={seat} />
      </main>

      <Dock seat={seat} driving={driving} />

      <Inbox seat={seat} />
      {sos !== "idle" ? <Sos seat={seat} /> : null}
    </div>
  );
}
