"use client";
// The modules of a seat's screen, per seat. Each seat gets the home it needs, as production
// cars and robotaxis lay them out: the driver a drive view (speed, ADAS, the next turn, the
// map, one media tile), the co-pilot a navigator with a privacy shield, the rear a lounge, or
// in cab mode a rider's screen (trip, pull over, help, quiet ride). Every driving rule comes
// from system.ts (canPlay, canOpen); these views only show the result and say why.
import { type ReactNode, useEffect, useState } from "react";
import s from "./cabin.module.css";
import { Icon, type IconName } from "./Icon";
import { dispatch, useSystem } from "./store";
import {
  ACCENTS,
  canPlay,
  formatTime,
  JOURNEY,
  LIBRARY,
  MEDIA_BY_ID,
  type MediaKind,
  SEAT_IDS,
  SEAT_NAME,
  type SeatId,
  STATION_NAME,
  type Station,
  VEHICLE,
} from "./system";
import { Art, Card, IconButton, Press, Range, Segmented, Switch } from "./ui";

const WHEN_PARKED = "available when parked";
const MAP = "/media/maps/mumbai-route.webp";
const AR = "/media/maps/ar-coastal.webp";

function useDriving(seat: SeatId) {
  return useSystem((st) => seat === "driver" && st.moving);
}

/** A live clock for the screens: renders empty on the server, so it never mismatches. */
export function useClock() {
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

/** The car's speed while moving: a gentle, believable wander around 62 km/h. */
function useSpeed(moving: boolean) {
  const [v, setV] = useState(moving ? 62 : 0);
  useEffect(() => {
    if (!moving) {
      setV(0);
      return;
    }
    let t = 0;
    const id = window.setInterval(() => {
      t += 1;
      setV(Math.round(62 + Math.sin(t / 3) * 4 + Math.sin(t / 1.7) * 1.5));
    }, 1000);
    return () => window.clearInterval(id);
  }, [moving]);
  return v;
}

// ---------------------------------------------------------------- shared parts

/** Send something from this seat to another: the targets, as a small menu of buttons. */
export function SendTo({
  seat,
  kind,
  refId,
  title,
  compact,
  below,
}: {
  seat: SeatId;
  kind: "media" | "place" | "clip";
  refId: string;
  title: string;
  compact?: boolean;
  below?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={s.sendTo}>
      <Press
        className={`${s.chip} ${compact ? s.iconButton : ""}`}
        onPress={() => setOpen((o) => !o)}
        label={`Send to another screen: ${title}`}
        pressed={open}
      >
        <Icon name="share" size="1.1em" />
        {compact ? null : <span>Send to</span>}
      </Press>
      {open ? (
        <div className={s.sendMenu} data-below={below ? "" : undefined}>
          {SEAT_IDS.filter((t) => t !== seat).map((t) => (
            <Press
              key={t}
              className={s.sendTarget}
              sound="send"
              onPress={() => {
                dispatch({ type: "share", from: seat, to: t, kind, ref: refId, title });
                setOpen(false);
              }}
            >
              {SEAT_NAME[t]}
            </Press>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Eq() {
  return (
    <span className={s.eq} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/** Play / pause / next for a seat, with the driving lock applied. */
function Transport({ seat, big }: { seat: SeatId; big?: boolean }) {
  const id = useSystem((st) => st.seats[seat].nowPlaying);
  const playing = useSystem((st) => st.seats[seat].playing);
  const state = useSystem((st) => st);
  const item = id ? MEDIA_BY_ID[id] : undefined;
  if (!item) return null;
  const locked = !playing && !canPlay(state, seat, item) ? WHEN_PARKED : undefined;
  const next = () => {
    const pool = LIBRARY.filter(
      (m) => m.kind === item.kind && (item.station ? m.station === item.station : true),
    );
    const n = pool[(pool.findIndex((m) => m.id === item.id) + 1) % pool.length];
    if (n && n.id !== item.id) dispatch({ type: "play", seat, id: n.id });
  };
  return (
    <div className={s.transport}>
      <IconButton
        icon="prev"
        label="Restart"
        onPress={() => dispatch({ type: "seek", seat, to: 0 })}
        variant="quiet"
      />
      <IconButton
        icon={playing ? "pause" : "play"}
        label={playing ? "Pause" : "Play"}
        onPress={() => dispatch({ type: "toggle-play", seat })}
        {...(locked ? { locked } : {})}
        variant="accent"
        filled={!playing}
      />
      <IconButton icon="next" label="Next" onPress={next} variant="quiet" />
      {big ? null : <SendTo seat={seat} kind="media" refId={item.id} title={item.title} compact />}
    </div>
  );
}

function NowPlaying({ seat, size = "large" }: { seat: SeatId; size?: "large" | "small" }) {
  const id = useSystem((st) => st.seats[seat].nowPlaying);
  const playing = useSystem((st) => st.seats[seat].playing);
  const progress = useSystem((st) => st.seats[seat].progress);
  const state = useSystem((st) => st);
  const item = id ? MEDIA_BY_ID[id] : undefined;
  if (!item) return <p className={s.muted}>Nothing playing.</p>;
  const blocked = !canPlay(state, seat, item);
  return (
    <div className={s.nowCard}>
      {size === "large" ? (
        <Art
          hue={item.hue}
          seed={item.seed}
          className={s.nowArt}
          {...(item.video ? { video: true } : {})}
        />
      ) : null}
      <div className={s.bigMediaTop}>
        {size === "small" ? <Art hue={item.hue} seed={item.seed} className={s.bigArt} /> : null}
        <div>
          <p className={s.kicker}>
            {blocked ? "Paused while moving" : playing ? "Now playing" : "Paused"}
            {playing && !blocked ? <Eq /> : null}
          </p>
          <p className={s.nowTitle}>{item.title}</p>
          <p className={s.muted}>{item.by}</p>
        </div>
      </div>
      <div className={s.progress} role="presentation">
        <span style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <Transport seat={seat} />
    </div>
  );
}

/** Route on the Google Maps capture: Bandra West to Colaba along the coast. */
const ROUTE = [
  [330, 58],
  [318, 75],
  [303, 96],
  [296, 130],
  [300, 170],
  [291, 205],
  [276, 240],
  [262, 282],
  [256, 318],
  [268, 338],
  [286, 352],
  [298, 378],
  [304, 410],
  [316, 445],
  [322, 468],
  [312, 500],
  [298, 522],
] as const;
const ROUTE_D = `M${ROUTE.map(([x, y]) => `${x} ${y}`).join(" L")}`;
const HERE = ROUTE[6];

function MapView({
  label,
  banner,
  eta,
  zoom = 1.35,
  focus = "44% 34%",
  className,
}: {
  label: string;
  banner?: boolean;
  eta?: boolean;
  zoom?: number;
  focus?: string;
  className?: string | undefined;
}) {
  return (
    <figure
      className={`${s.mapFrame} ${className ?? ""}`}
      style={{ "--zoom": zoom, "--focus": focus } as React.CSSProperties}
    >
      <div style={{ position: "absolute", inset: 0, scale: zoom, transformOrigin: focus }}>
        {/* biome-ignore lint/performance/noImgElement: a static map capture, sized by CSS */}
        <img className={s.mapImg} style={{ scale: 1 }} src={MAP} alt="" loading="lazy" />
        <svg
          className={s.mapRoute}
          viewBox="0 0 700 640"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={label}
        >
          <path
            d={ROUTE_D}
            fill="none"
            stroke="#0b1a3a"
            strokeWidth="11"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d={ROUTE_D}
            fill="none"
            stroke="#5b8cff"
            strokeWidth="6.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={ROUTE[16][0]}
            cy={ROUTE[16][1]}
            r="9"
            fill="#fff"
            stroke="#2d63ee"
            strokeWidth="4"
          />
          <g transform={`translate(${HERE[0]} ${HERE[1]}) rotate(200)`}>
            <circle r="16" fill="rgb(91 140 255 / 0.25)" />
            <path d="M0 -10 L7 8 L0 4 L-7 8 Z" fill="#fff" stroke="#2d63ee" strokeWidth="2" />
          </g>
        </svg>
      </div>
      {banner ? (
        <div className={s.turnBanner}>
          <Icon name="turn" />
          <div>
            <span className={s.turnDist}>{JOURNEY.next.distance}</span>
            <p className={s.turnRoad}>
              {JOURNEY.next.action}
              <strong>{JOURNEY.next.road}</strong>
            </p>
          </div>
        </div>
      ) : null}
      {eta ? (
        <div className={s.etaBar}>
          <strong>{JOURNEY.arrive}</strong>
          <span className={s.muted}>
            {JOURNEY.etaMinutes} min · {JOURNEY.km} km
          </span>
        </div>
      ) : null}
      <figcaption className={s.mapAttribution}>Map data ©2026 Google</figcaption>
    </figure>
  );
}

const PLACE_ICON: Record<string, IconName> = { lumen: "coffee", charge: "bolt", sorrel: "bread" };
const POI_AT: Record<string, [string, string]> = {
  lumen: ["24%", "40%"],
  charge: ["80%", "46%"],
  sorrel: ["57%", "34%"],
};

function ArView({ seat }: { seat: SeatId }) {
  return (
    <div className={s.ar}>
      {/* biome-ignore lint/performance/noImgElement: a static camera frame, sized by CSS */}
      <img src={AR} alt="" loading="lazy" />
      <svg
        className={s.arOverlay}
        viewBox="0 0 1600 561"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Augmented-reality view of the road ahead, with the route and places marked"
      >
        <defs>
          <linearGradient id="arLane" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="var(--k-accent-2)" stopOpacity="0.75" />
            <stop offset="1" stopColor="var(--k-accent-2)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M380 561 C560 440 700 345 772 298 L804 298 C812 360 826 450 842 561 Z"
          fill="url(#arLane)"
        />
        {(
          [
            [637, 512, 1],
            [688, 440, 0.78],
            [731, 380, 0.6],
          ] as const
        ).map(([x, y, k], i) => (
          <path
            key={x}
            className={s.chevron}
            style={{ animationDelay: `${i * -0.5}s` }}
            d={`M${x - 46 * k} ${y + 22 * k} L${x} ${y} L${x + 46 * k} ${y + 22 * k}`}
            fill="none"
            stroke="#fff"
            strokeWidth={9 * k}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <ul className={s.pois}>
        {JOURNEY.places.map((p) => {
          const [left, top] = POI_AT[p.id] ?? ["50%", "50%"];
          return (
            <li key={p.id} className={s.poi} style={{ left, top }}>
              <Icon name={PLACE_ICON[p.id] ?? "pin"} />
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.kind} · {p.distance}
                </small>
              </span>
              <SendTo seat={seat} kind="place" refId={p.id} title={p.name} compact below />
            </li>
          );
        })}
      </ul>
      <p className={s.mapAttribution}>Street View image ©2026 Google · Coastal Road, Mumbai</p>
    </div>
  );
}

function Trip({ compact }: { compact?: boolean }) {
  const done = 0.36;
  return (
    <div className={s.trip}>
      <div className={s.tripEnds}>
        <span>
          <span className={s.kicker}>From</span>
          <strong>{JOURNEY.from}</strong>
        </span>
        <span style={{ textAlign: "right" }}>
          <span className={s.kicker}>To</span>
          <strong>{JOURNEY.to}</strong>
        </span>
      </div>
      <div className={s.tripBar} role="presentation">
        <span style={{ width: `${done * 100}%` }} />
        <i style={{ left: `${done * 100}%` }} />
      </div>
      {compact ? null : (
        <div className={s.row} style={{ justifyContent: "space-between" }}>
          <p className={s.bigStat}>
            <b>{JOURNEY.etaMinutes}</b>
            <span>min · arrive {JOURNEY.arrive}</span>
          </p>
          <span className={s.badge} data-tone="ok">
            Light traffic · via {JOURNEY.via}
          </span>
        </div>
      )}
    </div>
  );
}

function ZoneStepper({ seat }: { seat: SeatId }) {
  const zone = useSystem((st) => st.zones[seat]);
  return (
    <div className={s.stepper}>
      <IconButton
        icon="minus"
        label="Cooler"
        onPress={() => dispatch({ type: "temp", seat, by: -0.5 })}
      />
      <output className={s.temp} aria-live="polite" aria-label={`${zone.temp.toFixed(1)} degrees`}>
        {zone.temp.toFixed(1)}
        <sup>°C</sup>
      </output>
      <IconButton
        icon="plus"
        label="Warmer"
        onPress={() => dispatch({ type: "temp", seat, by: 0.5 })}
      />
    </div>
  );
}

function Levels({ value, cool }: { value: number; cool?: boolean }) {
  return (
    <span className={s.levels} aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <i
          key={i}
          className={s.level}
          data-on={value >= i ? "" : undefined}
          data-cool={cool ? "" : undefined}
        />
      ))}
    </span>
  );
}

export function ViewHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className={s.viewHead}>
      <h3 className={s.title}>{title}</h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- home, per seat

/** The driver: a drive view. Moving, it is glance-only: big type, no lists, no video. */
function DriveHome() {
  const moving = useSystem((st) => st.moving);
  const speed = useSpeed(moving);
  return (
    <div className={`${s.view} ${s.drive}`}>
      <Card className={s.cluster}>
        <div className={s.speedRow}>
          <p className={s.speed}>
            <b>{speed}</b>
            <span>km/h</span>
          </p>
          <span className={s.limit} role="img" aria-label={`Speed limit ${VEHICLE.speedLimit}`}>
            {VEHICLE.speedLimit}
          </span>
        </div>
        <p className={s.gears}>
          <span className="sr-only">Gear {moving ? "D" : "P"}: </span>
          {["P", "R", "N", "D"].map((g) => (
            <span key={g} data-on={(moving ? g === "D" : g === "P") ? "" : undefined}>
              {g}
            </span>
          ))}
        </p>
        <div className={s.adas}>
          <svg
            viewBox="0 0 200 120"
            role="img"
            aria-label="Driver assistance: lane keeping on, a car ahead at a safe distance"
          >
            <path
              d="M70 120 L95 20"
              stroke="#5b8cff"
              strokeWidth="3"
              strokeLinecap="round"
              opacity={moving ? 1 : 0.35}
            />
            <path
              d="M130 120 L105 20"
              stroke="#5b8cff"
              strokeWidth="3"
              strokeLinecap="round"
              opacity={moving ? 1 : 0.35}
            />
            <path
              d="M20 120 L80 20"
              stroke="rgb(255 255 255 / 0.18)"
              strokeWidth="2"
              strokeDasharray="8 8"
            />
            <path
              d="M180 120 L120 20"
              stroke="rgb(255 255 255 / 0.18)"
              strokeWidth="2"
              strokeDasharray="8 8"
            />
            {moving ? (
              <>
                <path d="M84 70 h32 l-3 -14 h-26 Z" fill="rgb(255 255 255 / 0.55)" />
                <path d="M88 84 h24" stroke="#5b8cff" strokeWidth="2" opacity="0.7" />
              </>
            ) : null}
            <path d="M80 118 h40 l-5 -22 h-30 Z" fill="#fff" />
          </svg>
        </div>
        <div className={s.adasTags}>
          <span className={s.badge} data-tone={moving ? "accent" : undefined}>
            <Icon name="speed" size="1.1em" /> ACC {VEHICLE.setSpeed}
          </span>
          <span className={s.badge} data-tone={moving ? "ok" : undefined}>
            Lane keep
          </span>
        </div>
        <div className={s.range2}>
          <div>
            <span style={{ width: `${VEHICLE.battery * 100}%` }} />
          </div>
          <p>
            <span>
              <strong>{VEHICLE.rangeKm} km</strong> range
            </span>
            <span>{Math.round(VEHICLE.battery * 100)}%</span>
          </p>
        </div>
      </Card>
      <MapView
        label={`Route from ${JOURNEY.from} to ${JOURNEY.to} via ${JOURNEY.via}`}
        banner
        eta
        zoom={1.9}
        focus="42% 36%"
        className={s.driveMap}
      />
      <div className={s.driveSide}>
        <Card title="Media" className={s.bigMedia}>
          <NowPlaying seat="driver" size="small" />
        </Card>
        <Card>
          <p className={s.glanceNote}>
            <Icon name="eye" />
            {moving
              ? "Glance mode: each look is two seconds or less. Video, settings and typing wait until you park; voice and the wheel controls do the rest."
              : "Parked: every module is open. Set the car moving to see glance mode."}
          </p>
        </Card>
      </div>
    </div>
  );
}

/** The co-pilot: the navigator, with the privacy shield that lets video play while moving. */
function CopilotHome() {
  const shield = useSystem((st) => st.shield);
  const moving = useSystem((st) => st.moving);
  return (
    <div className={`${s.view} ${s.homeGrid}`}>
      <div className={s.span7} style={{ display: "grid" }}>
        <MapView label={`Route to ${JOURNEY.to}`} banner eta zoom={1.25} focus="44% 45%" />
      </div>
      <div
        className={s.span5}
        style={{ display: "grid", gap: "var(--gap)", alignContent: "start" }}
      >
        <Card>
          <div className={s.shield}>
            <span className={s.shieldIcon} data-off={shield ? undefined : ""}>
              <Icon name={shield ? "shield" : "eyeOff"} />
            </span>
            <Switch
              label="Privacy shield"
              detail={
                shield
                  ? "Hidden from the driver's seat, so video can play while moving"
                  : moving
                    ? "Off: video pauses while the car moves"
                    : "Off: turn it on before you watch on the move"
              }
              checked={shield}
              onChange={(on) => dispatch({ type: "shield", on })}
            />
          </div>
        </Card>
        <Card title="Now playing">
          <NowPlaying seat="copilot" size="small" />
        </Card>
        <Card title="Add a stop">
          <ul className={s.list}>
            {JOURNEY.places.map((p) => (
              <li key={p.id} className={s.placeRow}>
                <Icon name={PLACE_ICON[p.id] ?? "pin"} />
                <span>
                  {p.name} <span className={s.muted}>· {p.distance}</span>
                </span>
                <SendTo seat="copilot" kind="place" refId={p.id} title={p.name} compact />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 5
    ? "Good night"
    : h < 12
      ? "Good morning"
      : h < 18
        ? "Good afternoon"
        : "Good evening";
}

/** A rear seat in a private car: a lounge. */
function RearHome({ seat }: { seat: SeatId }) {
  const [hello, setHello] = useState("Hello");
  useEffect(() => setHello(greeting()), []);
  const heat = useSystem((st) => st.heat[seat]);
  const massage = useSystem((st) => st.massage[seat]);
  return (
    <div className={`${s.view} ${s.homeGrid}`}>
      <div className={s.span12}>
        <p className={s.greeting}>
          {hello}. <em>{JOURNEY.etaMinutes} minutes</em> to {JOURNEY.to}.
        </p>
      </div>
      <Card className={s.span7}>
        <Trip />
      </Card>
      <Card title="Weather at Colaba" className={s.span5}>
        <p className={s.weather}>
          <Icon name="sun" />
          <b>{VEHICLE.outside}°</b>
          <span className={s.muted}>Clear evening, sea breeze</span>
        </p>
      </Card>
      <Card title="Now playing" className={s.span6}>
        <NowPlaying seat={seat} size="small" />
      </Card>
      <Card title={`For this journey, ${JOURNEY.etaMinutes} min`} className={s.span6}>
        <ul className={s.list}>
          {LIBRARY.filter((m) => m.minutes <= JOURNEY.etaMinutes)
            .slice(0, 3)
            .map((m) => (
              <li key={m.id}>
                <Press
                  className={s.listButton}
                  onPress={() => dispatch({ type: "play", seat, id: m.id })}
                >
                  <Art hue={m.hue} seed={m.seed} className={s.thumb} />
                  <span>
                    {m.title}
                    <span className={s.muted}> · {formatTime(m.minutes)}</span>
                  </span>
                  <Icon name="play" size="1.2em" />
                </Press>
              </li>
            ))}
        </ul>
      </Card>
      <div className={`${s.span12} ${s.actions}`}>
        <Press
          className={s.action}
          pressed={heat > 0}
          onPress={() => dispatch({ type: "heat", seat, to: (heat + 1) % 4 })}
        >
          <Icon name="heat" />
          <span>
            Seat heat
            <small>{heat ? `Level ${heat}` : "Off"}</small>
          </span>
        </Press>
        <Press
          className={s.action}
          pressed={massage}
          onPress={() => dispatch({ type: "massage", seat })}
        >
          <Icon name="seat" />
          <span>
            Massage
            <small>{massage ? "Gentle wave" : "Off"}</small>
          </span>
        </Press>
        <Press
          className={s.action}
          onPress={() => dispatch({ type: "open", seat, module: "climate" })}
        >
          <Icon name="climate" />
          <span>
            Climate
            <small>Your zone</small>
          </span>
        </Press>
        <Press
          className={s.action}
          onPress={() => dispatch({ type: "open", seat, module: "clips" })}
        >
          <Icon name="clips" />
          <span>
            Memory clip
            <small>Save this moment</small>
          </span>
        </Press>
      </div>
    </div>
  );
}

/** A rear seat in cab mode: the rider's screen, after what robotaxi services put there. */
export function RideHome({ seat }: { seat: SeatId }) {
  const ride = useSystem((st) => st.ride);
  return (
    <div className={`${s.view} ${s.homeGrid}`}>
      <div className={s.span12}>
        <p className={s.greeting}>
          Welcome aboard. <em>Arriving {JOURNEY.arrive}</em>
        </p>
      </div>
      <Card className={s.span7}>
        <Trip />
        {ride.stop === "requested" ? (
          <p className={s.note}>
            <Icon name="pull" />
            Pulling over at the next safe place, in about 200 m.
          </p>
        ) : null}
      </Card>
      <div className={s.span5} style={{ display: "grid" }}>
        <MapView label={`Your route to ${JOURNEY.to}`} zoom={1.15} focus="44% 45%" />
      </div>
      <div className={`${s.span12} ${s.actions}`}>
        <Press
          className={s.action}
          data-tone="warn"
          pressed={ride.stop === "requested"}
          onPress={() => dispatch({ type: "pull-over" })}
        >
          <Icon name="pull" />
          <span>
            {ride.stop === "requested" ? "Cancel stop" : "Pull over"}
            <small>Safely, at the next place</small>
          </span>
        </Press>
        <Press
          className={s.action}
          pressed={ride.quiet}
          onPress={() => dispatch({ type: "quiet", on: !ride.quiet })}
        >
          <Icon name="mute" />
          <span>
            Quiet ride
            <small>{ride.quiet ? "Driver told" : "Tell the driver"}</small>
          </span>
        </Press>
        <Press
          className={s.action}
          pressed={ride.help}
          onPress={() => dispatch({ type: "help", on: !ride.help })}
        >
          <Icon name="help" />
          <span>
            {ride.help ? "End call" : "Rider support"}
            <small>{ride.help ? "Connected (demo)" : "Talk to a person"}</small>
          </span>
        </Press>
        <Press
          className={s.action}
          onPress={() => dispatch({ type: "open", seat, module: "media" })}
        >
          <Icon name="radio" />
          <span>
            Music
            <small>AVENUE Radio</small>
          </span>
        </Press>
      </div>
      <Card title="Your zone" className={s.span6}>
        <ZoneStepper seat={seat} />
      </Card>
      <Card title="Now playing" className={s.span6}>
        <NowPlaying seat={seat} size="small" />
      </Card>
    </div>
  );
}

export function Home({ seat }: { seat: SeatId }) {
  const fleet = useSystem((st) => st.fleet);
  if (seat === "driver") return <DriveHome />;
  if (seat === "copilot") return <CopilotHome />;
  return fleet ? <RideHome seat={seat} /> : <RearHome seat={seat} />;
}

// ---------------------------------------------------------------- media

const KINDS: ReadonlyArray<{ value: MediaKind | "journey" | "radio"; label: string }> = [
  { value: "journey", label: "For this journey" },
  { value: "radio", label: "Radio" },
  { value: "show", label: "Shows" },
  { value: "film", label: "Films" },
  { value: "podcast", label: "Podcasts" },
];

function Radio({ seat }: { seat: SeatId }) {
  const id = useSystem((st) => st.seats[seat].nowPlaying);
  const playing = useSystem((st) => st.seats[seat].playing);
  const sound = useSystem((st) => st.sound);
  const current = id ? MEDIA_BY_ID[id] : undefined;
  const play = (station: Station) => {
    const first = LIBRARY.find((m) => m.station === station);
    if (!first) return;
    if (!sound) {
      void import("./sound").then((m) => m.enableSound());
      dispatch({ type: "sound", on: true });
    }
    dispatch({ type: "play", seat, id: current?.station === station ? current.id : first.id });
  };
  return (
    <>
      <div className={s.stations}>
        {(["edm", "lofi"] as const).map((st) => {
          const on = current?.station === st && playing;
          return (
            <Press
              key={st}
              className={s.station}
              data-station={st}
              pressed={current?.station === st}
              onPress={() => play(st)}
            >
              {on ? <Eq /> : null}
              <small>AVENUE Radio</small>
              <b>{STATION_NAME[st]}</b>
              <small>
                {st === "edm" ? "124 to 128 BPM, made live" : "74 to 80 BPM, made live"}
              </small>
            </Press>
          );
        })}
      </div>
      <p className={s.fine}>
        Generated in your browser as you listen; no recordings.{" "}
        {sound ? "You hear only this seat's zone." : "Turn sound on to hear it."}
      </p>
      <ul className={s.list}>
        {LIBRARY.filter((m) => m.kind === "music").map((m) => (
          <li key={m.id}>
            <Press
              className={s.listButton}
              pressed={m.id === id}
              onPress={() => dispatch({ type: "play", seat, id: m.id })}
            >
              <Art hue={m.hue} seed={m.seed} className={s.thumb} />
              <span>
                {m.title}
                <span className={s.muted}> · {STATION_NAME[m.station ?? "lofi"]}</span>
              </span>
              {m.id === id && playing ? <Eq /> : <Icon name="play" size="1.2em" />}
            </Press>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Media({ seat }: { seat: SeatId }) {
  const [kind, setKind] = useState<MediaKind | "journey" | "radio">("journey");
  const state = useSystem((st) => st);
  const driving = useDriving(seat);
  const nowId = state.seats[seat].nowPlaying;
  const copilotBlocked = seat === "copilot" && state.moving && !state.shield;
  const items = LIBRARY.filter((m) =>
    kind === "journey" ? m.minutes <= JOURNEY.etaMinutes : m.kind === kind,
  );
  const queue = LIBRARY.filter((m) => m.id !== nowId && !m.video).slice(0, 3);
  return (
    <div className={`${s.view} ${s.media}`}>
      <div className={s.mediaMain}>
        <ViewHead title="Library">
          <Segmented label="Show" hideLabel options={KINDS} value={kind} onChange={setKind} />
        </ViewHead>
        {driving ? (
          <p className={s.note}>
            <Icon name="lock" />
            Moving: video waits until you park. Send it to another screen, or play audio.
          </p>
        ) : copilotBlocked ? (
          <p className={s.note}>
            <Icon name="eyeOff" />
            Turn on the privacy shield to watch while moving.
          </p>
        ) : null}
        {kind === "radio" ? (
          <Radio seat={seat} />
        ) : (
          <ul className={s.library}>
            {items.map((m) => {
              const locked = !canPlay(state, seat, m) ? WHEN_PARKED : undefined;
              return (
                <li key={m.id}>
                  <Press
                    className={s.tile}
                    onPress={() => dispatch({ type: "play", seat, id: m.id })}
                    {...(locked ? { locked } : {})}
                    pressed={m.id === nowId}
                    label={`${m.title}, ${m.by}`}
                  >
                    <Art hue={m.hue} seed={m.seed} className={s.tileArt} />
                    <span className={s.tileTitle}>{m.title}</span>
                    <span className={s.tileMeta}>
                      {locked ? <Icon name="lock" /> : null}
                      {m.station ? STATION_NAME[m.station] : formatTime(m.minutes)}
                    </span>
                  </Press>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <aside className={s.mediaMain} aria-label="Now playing and queue">
        <Card>
          <NowPlaying seat={seat} />
        </Card>
        <Card title="Up next">
          <ol className={s.queue}>
            {queue.map((m) => (
              <li key={m.id}>
                <Art hue={m.hue} seed={m.seed} className={s.thumb} />
                <span>
                  {m.title}
                  <span className={s.muted}> · {m.by}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- journey

export function Journey({ seat }: { seat: SeatId }) {
  const driving = useDriving(seat);
  const [view, setView] = useState<"map" | "ar">("map");
  const ar = view === "ar" && !driving;
  return (
    <div className={`${s.view} ${s.journey}`}>
      <div className={s.journeyView}>
        {ar ? (
          <ArView seat={seat} />
        ) : (
          <MapView
            label={`Route from ${JOURNEY.from} to ${JOURNEY.to} via ${JOURNEY.via}`}
            banner
            eta
            zoom={driving ? 1.9 : 1.2}
            focus={driving ? "42% 36%" : "44% 45%"}
          />
        )}
      </div>
      <div className={s.journeyFacts}>
        {driving ? (
          <p className={s.note}>
            <Icon name="lock" />
            AR view is available when parked.
          </p>
        ) : (
          <Segmented
            label="View"
            hideLabel
            value={view}
            onChange={setView}
            options={[
              { value: "map", label: "Map", icon: "map" },
              { value: "ar", label: "AR view", icon: "ar" },
            ]}
          />
        )}
        <Card>
          <Trip compact />
          <p className={s.bigStat}>
            <b>{JOURNEY.etaMinutes}</b>
            <span>
              min · {JOURNEY.km} km · arrive {JOURNEY.arrive}
            </span>
          </p>
        </Card>
        <Card>
          <p className={s.kicker}>Next</p>
          <p className={s.nextTurn}>
            <Icon name="turn" />
            {JOURNEY.nextTurn}
          </p>
        </Card>
        {driving ? null : (
          <Card title="Along the way">
            <ul className={s.list}>
              {JOURNEY.places.map((p) => (
                <li key={p.id} className={s.placeRow}>
                  <Icon name={PLACE_ICON[p.id] ?? "pin"} />
                  <span>
                    {p.name}{" "}
                    <span className={s.muted}>
                      · {p.kind}, {p.distance}
                    </span>
                  </span>
                  <SendTo seat={seat} kind="place" refId={p.id} title={p.name} compact />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- climate

export function Climate({ seat }: { seat: SeatId }) {
  const [tab, setTab] = useState<"climate" | "lighting" | "seats">("climate");
  const zone = useSystem((st) => st.zones[seat]);
  const zones = useSystem((st) => st.zones);
  const syncRear = useSystem((st) => st.syncRear);
  const airflow = useSystem((st) => st.airflow);
  const fresh = useSystem((st) => st.fresh);
  const ambient = useSystem((st) => st.ambient);
  const reading = useSystem((st) => st.reading[seat]);
  const massage = useSystem((st) => st.massage[seat]);
  const heat = useSystem((st) => st.heat[seat]);
  const vent = useSystem((st) => st.vent[seat]);
  const driving = useDriving(seat);
  const rear = seat === "rearLeft" || seat === "rearRight";
  return (
    <div className={s.view}>
      <ViewHead title="Climate and comfort">
        {driving ? null : (
          <Segmented
            label="Section"
            hideLabel
            value={tab}
            onChange={setTab}
            options={[
              { value: "climate", label: "Climate", icon: "fan" },
              { value: "lighting", label: "Lighting", icon: "light" },
              { value: "seats", label: "Seat", icon: "seat" },
            ]}
          />
        )}
      </ViewHead>
      {tab === "climate" || driving ? (
        <div className={s.climateGrid}>
          <Card title={`${SEAT_NAME[seat]} zone`}>
            <ZoneStepper seat={seat} />
            {driving ? (
              <p className={s.glanceNote}>
                <Icon name="mic" />
                More on the wheel controls, or say “warmer”.
              </p>
            ) : (
              <Range
                label="Fan"
                min={0}
                max={4}
                step={1}
                value={zone.fan}
                onChange={(v) => dispatch({ type: "fan", seat, to: v })}
                format={(v) => (v === 0 ? "Off" : `${v} of 4`)}
              />
            )}
          </Card>
          <Card title="Seat">
            <div className={s.seatRow}>
              <span className={s.seatRowHead}>
                <span>Heat</span>
                <Levels value={heat} />
              </span>
              <Segmented
                label="Seat heat"
                hideLabel
                value={String(heat) as "0" | "1" | "2" | "3"}
                onChange={(v) => dispatch({ type: "heat", seat, to: Number(v) })}
                options={[
                  { value: "0", label: "Off" },
                  { value: "1", label: "1" },
                  { value: "2", label: "2" },
                  { value: "3", label: "3" },
                ]}
              />
            </div>
            <div className={s.seatRow}>
              <span className={s.seatRowHead}>
                <span>Ventilation</span>
                <Levels value={vent} cool />
              </span>
              <Segmented
                label="Seat ventilation"
                hideLabel
                value={String(vent) as "0" | "1" | "2" | "3"}
                onChange={(v) => dispatch({ type: "vent", seat, to: Number(v) })}
                options={[
                  { value: "0", label: "Off" },
                  { value: "1", label: "1" },
                  { value: "2", label: "2" },
                  { value: "3", label: "3" },
                ]}
              />
            </div>
          </Card>
          {driving ? null : (
            <>
              <Card title="Airflow">
                <Segmented
                  label="Airflow"
                  hideLabel
                  value={airflow}
                  onChange={(to) => dispatch({ type: "airflow", to })}
                  options={[
                    { value: "auto", label: "Auto" },
                    { value: "face", label: "Face" },
                    { value: "feet", label: "Feet" },
                    { value: "both", label: "Both" },
                  ]}
                />
                <Switch
                  label="Fresh air"
                  detail={fresh ? "Drawing air from outside" : "Recirculating cabin air"}
                  checked={fresh}
                  onChange={(on) => dispatch({ type: "fresh", on })}
                />
                {rear ? (
                  <Switch
                    label="Sync rear seats"
                    detail="Both rear zones follow one setting"
                    checked={syncRear}
                    onChange={(on) => dispatch({ type: "sync-rear", on })}
                  />
                ) : null}
              </Card>
              <Card title="Four zones">
                <svg
                  className={s.cabinMap}
                  viewBox="0 0 200 250"
                  role="img"
                  aria-label={`Zones: driver ${zones.driver.temp}°, co-pilot ${zones.copilot.temp}°, rear left ${zones.rearLeft.temp}°, rear right ${zones.rearRight.temp}°`}
                >
                  <path
                    d="M40 40 Q100 -6 160 40 L168 210 Q100 250 32 210 Z"
                    fill="rgb(255 255 255 / 0.04)"
                    stroke="rgb(255 255 255 / 0.2)"
                  />
                  {SEAT_IDS.map((id, i) => {
                    const x = i % 2 === 0 ? 70 : 130;
                    const y = i < 2 ? 95 : 170;
                    const me = id === seat;
                    return (
                      <g key={id}>
                        <rect
                          x={x - 25}
                          y={y - 28}
                          width="50"
                          height="56"
                          rx="14"
                          fill={me ? "#2d63ee" : "rgb(255 255 255 / 0.1)"}
                        />
                        <text
                          x={x}
                          y={y + 6}
                          textAnchor="middle"
                          fontSize="16"
                          fill="#fff"
                          fontFamily="var(--font-mono)"
                        >
                          {zones[id].temp.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </Card>
            </>
          )}
        </div>
      ) : tab === "lighting" ? (
        <div className={s.climateGrid}>
          <Card title="Ambient light">
            <Range
              label="Brightness"
              min={0}
              max={1}
              step={0.05}
              value={ambient}
              onChange={(v) => dispatch({ type: "ambient", to: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <p className={s.fine}>
              Shared by the whole cabin. Watch the 3D cabin's light follow it.
            </p>
          </Card>
          <Card title="Your seat">
            <Switch
              label="Reading light"
              detail="Over this seat only"
              checked={reading}
              onChange={() => dispatch({ type: "reading", seat })}
            />
          </Card>
        </div>
      ) : (
        <div className={s.climateGrid}>
          <Card title="Seat">
            <Switch
              label="Massage"
              detail="Gentle wave, 15 minutes"
              checked={massage}
              onChange={() => dispatch({ type: "massage", seat })}
            />
            <p className={s.fine}>
              Recline and position stay on the seat's physical controls (card A).
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- routines, clips, settings

export function Routines({ seat }: { seat: SeatId }) {
  const routines = useSystem((st) => st.routines);
  const driving = useDriving(seat);
  return (
    <div className={s.view}>
      <ViewHead title="Routines">
        <Press
          className={s.chip}
          onPress={() => dispatch({ type: "open", seat, module: "routines" })}
          {...(driving ? { locked: WHEN_PARKED } : {})}
          label="New routine"
        >
          <Icon name="plus" size="1.1em" />
          <span>New</span>
        </Press>
      </ViewHead>
      <p className={s.muted}>
        One switch sets the cabin: light, temperature and what plays, by time, place or climate.
      </p>
      <Card>
        <ul className={s.routineList}>
          {routines.map((r) => (
            <li key={r.id}>
              <Switch
                label={r.name}
                detail={r.detail}
                checked={r.on}
                onChange={() => dispatch({ type: "routine", id: r.id })}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function Clips({ seat }: { seat: SeatId }) {
  const state = useSystem((st) => st.seats[seat].clip);
  const clips = useSystem((st) => st.clips);
  return (
    <div className={s.view}>
      <ViewHead title="Memory clips" />
      <div className={s.recorder} data-state={state}>
        <div className={s.recorderView} aria-hidden="true">
          <span className={s.recDot} />
        </div>
        <div className={s.recorderControls}>
          <p className={s.kicker} aria-live="polite">
            {state === "recording"
              ? "Recording from the cabin camera"
              : state === "saved"
                ? "Saved"
                : "Ready"}
          </p>
          {state === "recording" ? (
            <Press
              className={s.bigButton}
              variant="danger"
              onPress={() => dispatch({ type: "clip-stop", seat })}
              sound="confirm"
            >
              <Icon name="stop" filled />
              <span>Stop and save</span>
            </Press>
          ) : state === "saved" ? (
            <div className={s.row}>
              <SendTo
                seat={seat}
                kind="clip"
                refId={clips[0]?.id ?? ""}
                title={clips[0]?.title ?? "Clip"}
                below
              />
              <Press className={s.chip} onPress={() => dispatch({ type: "clip-discard", seat })}>
                <Icon name="check" size="1.1em" />
                <span>Keep on this screen</span>
              </Press>
            </div>
          ) : (
            <Press
              className={s.bigButton}
              variant="accent"
              onPress={() => dispatch({ type: "clip-start", seat })}
            >
              <Icon name="record" filled />
              <span>Record a clip</span>
            </Press>
          )}
          <p className={s.fine}>A demo: nothing is recorded.</p>
        </div>
      </div>
      <Card title="Saved">
        <ul className={s.list}>
          {clips.map((c) => (
            <li key={c.id} className={s.placeRow}>
              <Icon name="clips" />
              <span>
                {c.title}{" "}
                <span className={s.muted}>
                  · {c.seconds} s · {SEAT_NAME[c.seat]}
                </span>
              </span>
              <SendTo seat={seat} kind="clip" refId={c.id} title={c.title} compact />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function Settings({ seat }: { seat: SeatId }) {
  const settings = useSystem((st) => st.settings);
  const brightness = useSystem((st) => st.seats[seat].brightness);
  const textScale = useSystem((st) => st.seats[seat].textScale);
  const volume = useSystem((st) => st.volume[seat]);
  const theme = useSystem((st) => st.seats[seat].theme);
  const accent = useSystem((st) => st.seats[seat].accent);
  const set = (key: keyof typeof settings) => (on: boolean) =>
    dispatch({ type: "setting", key, on });
  return (
    <div className={s.view}>
      <ViewHead title="Settings" />
      <div className={s.settingsGrid}>
        <Card title="Display and sound">
          <Range
            label="Brightness"
            min={0.2}
            max={1}
            step={0.05}
            value={brightness}
            onChange={(to) => dispatch({ type: "brightness", seat, to })}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Range
            label="Volume, this zone"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(to) => dispatch({ type: "volume", seat, to })}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Segmented
            label="Text size"
            value={String(textScale) as "1" | "1.15" | "1.3"}
            onChange={(v) =>
              dispatch({ type: "text-scale", seat, to: Number(v) as 1 | 1.15 | 1.3 })
            }
            options={[
              { value: "1", label: "Default" },
              { value: "1.15", label: "Large" },
              { value: "1.3", label: "Largest" },
            ]}
          />
        </Card>
        <Card title="Appearance">
          <Segmented
            label="Theme"
            value={theme}
            onChange={(to) => dispatch({ type: "theme", seat, to })}
            options={[
              { value: "dark", label: "Dark", icon: "moon" },
              { value: "light", label: "Light", icon: "sun" },
            ]}
          />
          <Segmented
            label="Accent"
            value={accent}
            onChange={(to) => dispatch({ type: "accent", seat, to })}
            options={ACCENTS.map((a) => ({ value: a.id, label: a.name.split(" ")[0] ?? a.name }))}
          />
        </Card>
        <Card title="Accessibility">
          <Switch
            label="High contrast"
            detail="Stronger edges and text on every surface"
            checked={settings.highContrast}
            onChange={set("highContrast")}
          />
          <Switch
            label="Captions"
            detail="On for everything that plays"
            checked={settings.captions}
            onChange={set("captions")}
          />
        </Card>
        <Card title="Connections">
          <Switch
            label="Wi‑Fi"
            detail="Car hotspot"
            checked={settings.wifi}
            onChange={set("wifi")}
          />
          <Switch
            label="Bluetooth"
            detail="Headphones for this seat"
            checked={settings.bluetooth}
            onChange={set("bluetooth")}
          />
        </Card>
        <Card title="Privacy">
          <Switch
            label="Location for this seat"
            detail="Used for the route and nearby places"
            checked={settings.location}
            onChange={set("location")}
          />
          <Switch
            label="Usage data"
            detail="Off by default; nothing leaves the car"
            checked={settings.analytics}
            onChange={set("analytics")}
          />
        </Card>
        <Card title="About">
          <dl className={s.spec}>
            <div>
              <dt>System</dt>
              <dd>AVENUE, concept build</dd>
            </div>
            <div>
              <dt>Target OS</dt>
              <dd>Android Automotive 15</dd>
            </div>
            <div>
              <dt>Zone</dt>
              <dd>{SEAT_NAME[seat]}</dd>
            </div>
            <div>
              <dt>Reference SoC</dt>
              <dd>SA8295P class</dd>
            </div>
          </dl>
          <p className={s.fine}>
            This web demo runs the interface; the platform is scoped with each partner.
          </p>
        </Card>
      </div>
    </div>
  );
}
