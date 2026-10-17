"use client";
// One seat's screen: status bar, module rail, the module, the quick bar (memory clip, share,
// brightness, sound, SOS), and the overlays that can arrive from elsewhere in the car (a share
// waiting for a yes, the SOS countdown). The driver's screen reshapes itself while moving.
import { useEffect, useState } from "react";
import { MODULES, type ModuleId } from "@/content/modules";
import s from "./demo.module.css";
import { Icon, type IconName } from "./Icon";
import { Climate, Clips, Home, Journey, Media, Routines, SendTo, Settings } from "./modules";
import { dispatch, useSystem } from "./store";
import { DRIVER_LOCKED_MODULES, MEDIA_BY_ID, SEAT_NAME, type SeatId } from "./system";
import { IconButton, Press } from "./ui";

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

function useClock() {
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

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
      <Icon name="inbox" />
      <p id={`inbox-${share.id}`}>
        <span className={s.kicker}>From {SEAT_NAME[share.from].toLowerCase()}</span>
        <strong>{share.title}</strong>
        {item ? <span className={s.muted}> · {item.by}</span> : null}
      </p>
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
      {sos.state === "counting" ? (
        <p className={s.sosCount} aria-hidden="true">
          {sos.remaining}
        </p>
      ) : (
        <p className={s.sosCount} aria-hidden="true">
          <Icon name="sos" size="0.8em" />
        </p>
      )}
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

export function Screen({ seat }: { seat: SeatId }) {
  const module = useSystem((st) => st.seats[seat].module);
  const moving = useSystem((st) => st.moving);
  const textScale = useSystem((st) => st.seats[seat].textScale);
  const brightness = useSystem((st) => st.seats[seat].brightness);
  const highContrast = useSystem((st) => st.settings.highContrast);
  const sound = useSystem((st) => st.sound);
  const nowPlaying = useSystem((st) => st.seats[seat].nowPlaying);
  const sos = useSystem((st) => st.sos.state);
  const clock = useClock();
  const driving = seat === "driver" && moving;
  const View = VIEWS[module];
  const item = nowPlaying ? MEDIA_BY_ID[nowPlaying] : undefined;
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
        <span className={s.seatName}>
          <Icon name={seat === "driver" ? "car" : "seat"} size="1.2em" />
          {SEAT_NAME[seat]}
        </span>
        {driving ? (
          <span className={s.drivingBadge}>
            <Icon name="eye" size="1.1em" />
            Moving: glance mode
          </span>
        ) : null}
        <span className={s.statusRight}>
          <Icon name="wifi" size="1.1em" />
          <Icon name="bluetooth" size="1.1em" />
          <time className="mono">{clock}</time>
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
              <span className={s.railLabel}>{m.name}</span>
            </Press>
          );
        })}
      </nav>

      <main className={s.main} aria-label={MODULES.find((m) => m.id === module)?.name}>
        <View seat={seat} />
      </main>

      <footer className={s.quick}>
        <Press
          className={s.clipButton}
          onPress={() => dispatch({ type: "open", seat, module: "clips" })}
          {...(driving ? { locked: "available when parked" } : {})}
          label="Memory clips"
        >
          <Icon name="clips" />
          <span>Memory clips</span>
        </Press>
        <div className={s.quickMid}>
          {item ? <SendTo seat={seat} kind="media" refId={item.id} title={item.title} /> : null}
          <IconButton
            icon="mic"
            label="Voice: say what you need"
            onPress={() => dispatch({ type: "open", seat, module: driving ? "journey" : module })}
            variant="quiet"
          />
        </div>
        <div className={s.quickRight}>
          <IconButton
            icon={sound ? "sound" : "mute"}
            label={sound ? "Interface sounds on" : "Interface sounds off"}
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

      <Inbox seat={seat} />
      {sos !== "idle" ? <Sos seat={seat} /> : null}
    </div>
  );
}
