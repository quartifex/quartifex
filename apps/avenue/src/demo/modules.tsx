"use client";
// The seven modules of a seat's screen. Every rule about what the driver may do while moving
// comes from system.ts (canPlay, canOpen); these views only show the result and say why.
import { type ReactElement, useEffect, useState } from "react";
import s from "./demo.module.css";
import { Icon } from "./Icon";
import { dispatch, useSystem } from "./store";
import {
  formatTime,
  JOURNEY,
  LIBRARY,
  MEDIA_BY_ID,
  type MediaKind,
  SEAT_IDS,
  SEAT_NAME,
  type SeatId,
} from "./system";
import { Art, Card, IconButton, Press, Range, Segmented, Switch } from "./ui";

const WHEN_PARKED = "available when parked";

function useDriving(seat: SeatId) {
  return useSystem((st) => seat === "driver" && st.moving);
}

/** Send something from this seat to another: the targets, as a small menu of buttons. */
export function SendTo({
  seat,
  kind,
  refId,
  title,
  compact,
}: {
  seat: SeatId;
  kind: "media" | "place" | "clip";
  refId: string;
  title: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={s.sendTo}>
      <Press
        className={s.chip}
        onPress={() => setOpen((o) => !o)}
        label={`Send to another screen: ${title}`}
        pressed={open}
      >
        <Icon name="share" size="1.1em" />
        {compact ? null : <span>Send to</span>}
      </Press>
      {open ? (
        <div className={s.sendMenu}>
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

function NowPlaying({ seat, size = "large" }: { seat: SeatId; size?: "large" | "small" }) {
  const id = useSystem((st) => st.seats[seat].nowPlaying);
  const playing = useSystem((st) => st.seats[seat].playing);
  const progress = useSystem((st) => st.seats[seat].progress);
  const moving = useSystem((st) => st.moving);
  const item = id ? MEDIA_BY_ID[id] : undefined;
  if (!item) return <p className={s.muted}>Nothing playing.</p>;
  const locked = seat === "driver" && moving && item.video;
  return (
    <div className={s.nowPlaying} data-size={size}>
      <Art hue={item.hue} seed={item.seed} className={s.nowArt} />
      <div className={s.nowMeta}>
        <p className={s.kicker}>
          {locked ? "Paused while moving" : playing ? "Now playing" : "Paused"}
        </p>
        <p className={s.nowTitle}>{item.title}</p>
        <p className={s.muted}>{item.by}</p>
        <div className={s.progress} role="presentation">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
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
            {...(locked ? { locked: WHEN_PARKED } : {})}
            variant="accent"
            filled={!playing}
          />
          <IconButton
            icon="next"
            label="Next in queue"
            onPress={() => {
              const next = LIBRARY.find(
                (m) =>
                  m.kind === item.kind &&
                  m.id !== item.id &&
                  !(seat === "driver" && moving && m.video),
              );
              if (next) dispatch({ type: "play", seat, id: next.id });
            }}
            variant="quiet"
          />
          <SendTo
            seat={seat}
            kind="media"
            refId={item.id}
            title={item.title}
            compact={size === "small"}
          />
        </div>
      </div>
    </div>
  );
}

function MiniMap({ label = "Route map" }: { label?: string }) {
  return (
    <svg className={s.map} viewBox="0 0 320 200" role="img" aria-label={label}>
      <rect width="320" height="200" fill="var(--os-map)" />
      {[30, 70, 110, 150].map((y) => (
        <path
          key={y}
          d={`M-10 ${y} C 90 ${y - 18}, 200 ${y + 22}, 330 ${y - 6}`}
          stroke="var(--os-road)"
          strokeWidth="5"
          fill="none"
        />
      ))}
      {[60, 150, 240].map((x) => (
        <path
          key={x}
          d={`M${x} -10 C ${x - 14} 80, ${x + 18} 120, ${x - 4} 210`}
          stroke="var(--os-road)"
          strokeWidth="4"
          fill="none"
        />
      ))}
      <path
        d="M40 176 C 90 150, 120 160, 150 120 S 230 60, 284 30"
        stroke="var(--c-accent)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="40" cy="176" r="7" fill="var(--c-text)" />
      <circle cx="284" cy="30" r="7" fill="none" stroke="var(--c-accent)" strokeWidth="3" />
    </svg>
  );
}

export function Home({ seat }: { seat: SeatId }) {
  const driving = useDriving(seat);
  const [editing, setEditing] = useState(false);
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening",
    );
  }, []);
  const [order, setOrder] = useState(["journey", "playing", "weather", "news", "forJourney"]);
  const move = (id: string, by: number) =>
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + by;
      if (j < 0 || j >= o.length) return o;
      const next = o.slice();
      [next[i], next[j]] = [next[j] as string, next[i] as string];
      return next;
    });
  if (driving) {
    return (
      <div className={s.drivingHome}>
        <Card className={s.bigTile}>
          <p className={s.kicker}>Next turn</p>
          <p className={s.bigNumber}>
            <Icon name="turn" size="0.8em" /> 600 m
          </p>
          <p className={s.bigLine}>Ridge Lane</p>
          <p className={s.muted}>Arrive {JOURNEY.etaMinutes} min</p>
        </Card>
        <Card className={s.bigTile}>
          <NowPlaying seat={seat} size="small" />
        </Card>
      </div>
    );
  }
  const widgets: Record<string, ReactElement> = {
    journey: (
      <Card title="Journey">
        <MiniMap />
        <p className={s.etaLine}>
          <strong className="mono">{JOURNEY.etaMinutes} min</strong> to {JOURNEY.to}
        </p>
      </Card>
    ),
    playing: (
      <Card title="Now playing">
        <NowPlaying seat={seat} size="small" />
      </Card>
    ),
    weather: (
      <Card title="Weather">
        <p className={s.weather}>
          <Icon name="sun" size="1.6em" />
          <span className="mono">12°</span>
        </p>
        <p className={s.muted}>Clear at {JOURNEY.to}</p>
      </Card>
    ),
    news: (
      <Card title="News">
        <ul className={s.news}>
          <li>Harbour bridge reopens to traffic after repairs</li>
          <li>Night trains return on the coast line this spring</li>
        </ul>
        <p className={s.fine}>Sample headlines, invented for the demo.</p>
      </Card>
    ),
    forJourney: (
      <Card title={`For this journey, ${JOURNEY.etaMinutes} min`}>
        <ul className={s.shortList}>
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
                </Press>
              </li>
            ))}
        </ul>
      </Card>
    ),
  };
  return (
    <div className={s.home}>
      <div className={s.homeBar}>
        <h3 className={s.moduleTitle}>{greeting}</h3>
        <Press className={s.chip} onPress={() => setEditing((e) => !e)} pressed={editing}>
          <Icon name="grid" size="1.1em" />
          <span>{editing ? "Done" : "Edit layout"}</span>
        </Press>
      </div>
      <div className={s.widgets}>
        {order.map((id, i) => (
          <div key={id} className={s.widget} data-widget={id}>
            {widgets[id]}
            {editing ? (
              <div className={s.widgetMove}>
                <IconButton
                  icon="arrowUp"
                  label={`Move earlier (${i + 1} of ${order.length})`}
                  onPress={() => move(id, -1)}
                />
                <IconButton icon="arrowDown" label="Move later" onPress={() => move(id, 1)} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const KINDS: ReadonlyArray<{ value: MediaKind | "journey"; label: string }> = [
  { value: "journey", label: "For this journey" },
  { value: "show", label: "Shows" },
  { value: "film", label: "Films" },
  { value: "music", label: "Music" },
  { value: "podcast", label: "Podcasts" },
];

export function Media({ seat }: { seat: SeatId }) {
  const [kind, setKind] = useState<MediaKind | "journey">("journey");
  const driving = useDriving(seat);
  const moving = useSystem((st) => st.moving);
  const nowId = useSystem((st) => st.seats[seat].nowPlaying);
  const items = LIBRARY.filter((m) =>
    kind === "journey" ? m.minutes <= JOURNEY.etaMinutes : m.kind === kind,
  );
  const queue = LIBRARY.filter((m) => m.id !== nowId && !m.video).slice(0, 3);
  return (
    <div className={s.media}>
      <div className={s.mediaMain}>
        <h3 className={s.moduleTitle}>Library</h3>
        <Segmented label="Show" hideLabel options={KINDS} value={kind} onChange={setKind} />
        {driving ? (
          <p className={s.drivingNote}>
            Moving: video waits until parked. Send it to a rear screen, or play audio.
          </p>
        ) : null}
        <ul className={s.library}>
          {items.map((m) => {
            const locked = seat === "driver" && moving && m.video ? WHEN_PARKED : undefined;
            return (
              <li key={m.id} className={s.libraryItem}>
                <Press
                  className={s.tileButton}
                  onPress={() => dispatch({ type: "play", seat, id: m.id })}
                  {...(locked ? { locked } : {})}
                  pressed={m.id === nowId}
                >
                  <Art hue={m.hue} seed={m.seed} className={s.tileArt} />
                  <span className={s.tileTitle}>
                    {m.title}
                    <span className="sr-only">
                      , {m.by}
                      {locked ? `, ${locked}` : ""}
                    </span>
                  </span>
                  <span className={s.tileMeta}>
                    {locked ? <Icon name="lock" size="1em" /> : null}
                    {formatTime(m.minutes)}
                  </span>
                </Press>
              </li>
            );
          })}
        </ul>
      </div>
      <aside className={s.mediaSide} aria-label="Now playing and queue">
        <Card title="Now playing">
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

const PLACE_ICON = { lumen: "coffee", charge: "bolt", sorrel: "bread" } as const;

export function Journey({ seat }: { seat: SeatId }) {
  const driving = useDriving(seat);
  const [view, setView] = useState<"map" | "ar">("map");
  const ar = view === "ar" && !driving;
  return (
    <div className={s.journey}>
      <div className={s.journeyHead}>
        <h3 className={s.moduleTitle}>
          {JOURNEY.from} to {JOURNEY.to}
        </h3>
        {driving ? (
          <p className={s.drivingNote}>AR view is available when parked.</p>
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
      </div>
      <div className={s.journeyBody}>
        <div className={s.journeyView}>
          {ar ? (
            <svg
              className={s.arView}
              viewBox="0 0 640 360"
              role="img"
              aria-label="Augmented-reality view of the street ahead, with places marked"
            >
              <defs>
                <linearGradient id="arSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#11151b" />
                  <stop offset="1" stopColor="#1d222a" />
                </linearGradient>
              </defs>
              <rect width="640" height="360" fill="url(#arSky)" />
              <path d="M0 360 L270 190 L370 190 L640 360Z" fill="#14171c" />
              {[0, 1, 2, 3].map((i) => (
                <path
                  key={`l${i}`}
                  d={`M${40 + i * 52} ${120 - i * 12} h46 v${200 - i * 45} h-46Z`}
                  fill="#191d24"
                  stroke="#262b33"
                />
              ))}
              {[0, 1, 2, 3].map((i) => (
                <path
                  key={`r${i}`}
                  d={`M${554 - i * 52} ${110 - i * 10} h46 v${210 - i * 46} h-46Z`}
                  fill="#191d24"
                  stroke="#262b33"
                />
              ))}
              <path
                d="M320 350 L326 230 L344 200"
                stroke="var(--c-accent)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                opacity="0.85"
              />
            </svg>
          ) : (
            <MiniMap label="Route map from Harbour Road to Old Town Quay" />
          )}
          {ar ? (
            <ul className={s.pois}>
              {JOURNEY.places.map((p) => (
                <li key={p.id} className={s.poi} data-side={p.side}>
                  <Icon name={PLACE_ICON[p.id as keyof typeof PLACE_ICON]} />
                  <span>
                    <strong>{p.name}</strong>
                    <span className={s.muted}>
                      {p.kind} · {p.distance}
                    </span>
                  </span>
                  <SendTo seat={seat} kind="place" refId={p.id} title={p.name} compact />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={s.journeyFacts}>
          <Card>
            <p className={s.kicker}>Arrive in</p>
            <p className={s.bigNumber}>
              <span className="mono">{JOURNEY.etaMinutes}</span> min
            </p>
            <p className={s.muted}>{JOURNEY.km} km, light traffic</p>
          </Card>
          <Card>
            <p className={s.kicker}>Next</p>
            <p className={s.nextTurn}>
              <Icon name="turn" />
              {JOURNEY.nextTurn}
            </p>
          </Card>
          {driving ? null : (
            <Card title="Nearby">
              <ul className={s.shortList}>
                {JOURNEY.places.map((p) => (
                  <li key={p.id} className={s.placeRow}>
                    <Icon name={PLACE_ICON[p.id as keyof typeof PLACE_ICON]} />
                    <span>
                      {p.name} <span className={s.muted}>· {p.distance}</span>
                    </span>
                    <SendTo seat={seat} kind="place" refId={p.id} title={p.name} compact />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const driving = useDriving(seat);
  const rear = seat === "rearLeft" || seat === "rearRight";
  return (
    <div className={s.climate}>
      <div className={s.homeBar}>
        <h3 className={s.moduleTitle}>Climate and car</h3>
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
      </div>
      {tab === "climate" || driving ? (
        <div className={s.climateGrid}>
          <Card title={`${SEAT_NAME[seat]} zone`} className={s.tempCard}>
            <div className={s.stepper}>
              <IconButton
                icon="minus"
                label="Cooler"
                onPress={() => dispatch({ type: "temp", seat, by: -0.5 })}
              />
              <output className={s.temp} aria-live="polite">
                <span className="mono">{zone.temp.toFixed(1)}</span>°
              </output>
              <IconButton
                icon="plus"
                label="Warmer"
                onPress={() => dispatch({ type: "temp", seat, by: 0.5 })}
              />
            </div>
            {driving ? (
              <p className={s.drivingNote}>
                More settings on the steering-wheel controls, or say “warmer”.
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
              <Card title="Cabin">
                <svg
                  className={s.zones}
                  viewBox="0 0 160 240"
                  role="img"
                  aria-label={`Zones: driver ${zones.driver.temp}°, co-pilot ${zones.copilot.temp}°, rear left ${zones.rearLeft.temp}°, rear right ${zones.rearRight.temp}°`}
                >
                  <rect
                    x="20"
                    y="10"
                    width="120"
                    height="220"
                    rx="48"
                    fill="none"
                    stroke="var(--c-line-strong)"
                  />
                  {SEAT_IDS.map((id, i) => {
                    const x = i % 2 === 0 ? 50 : 110;
                    const y = i < 2 ? 90 : 170;
                    return (
                      <g key={id}>
                        <rect
                          x={x - 22}
                          y={y - 26}
                          width="44"
                          height="52"
                          rx="12"
                          fill={id === seat ? "var(--c-accent)" : "var(--c-raised)"}
                          opacity={id === seat ? 0.9 : 1}
                        />
                        <text
                          x={x}
                          y={y + 5}
                          textAnchor="middle"
                          fontSize="15"
                          fill={id === seat ? "var(--c-on-accent)" : "var(--c-text)"}
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

export function Routines({ seat }: { seat: SeatId }) {
  const routines = useSystem((st) => st.routines);
  const driving = useDriving(seat);
  return (
    <div className={s.routines}>
      <div className={s.homeBar}>
        <h3 className={s.moduleTitle}>Routines</h3>
        <Press
          className={s.chip}
          onPress={() => dispatch({ type: "open", seat, module: "routines" })}
          {...(driving ? { locked: WHEN_PARKED } : {})}
          label="New routine"
        >
          <Icon name="plus" size="1.1em" />
          <span>New</span>
        </Press>
      </div>
      <p className={s.muted}>
        One switch sets the cabin: light, temperature and what plays, by time, place or climate.
      </p>
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
    </div>
  );
}

export function Clips({ seat }: { seat: SeatId }) {
  const state = useSystem((st) => st.seats[seat].clip);
  const clips = useSystem((st) => st.clips);
  return (
    <div className={s.clips}>
      <h3 className={s.moduleTitle}>Memory clips</h3>
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
      <ul className={s.clipList}>
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
    </div>
  );
}

export function Settings({ seat }: { seat: SeatId }) {
  const settings = useSystem((st) => st.settings);
  const brightness = useSystem((st) => st.seats[seat].brightness);
  const textScale = useSystem((st) => st.seats[seat].textScale);
  const set = (key: keyof typeof settings) => (on: boolean) =>
    dispatch({ type: "setting", key, on });
  return (
    <div className={s.settings}>
      <h3 className={s.moduleTitle}>Settings</h3>
      <div className={s.settingsGrid}>
        <Card title="Display">
          <Range
            label="Brightness"
            min={0.2}
            max={1}
            step={0.05}
            value={brightness}
            onChange={(to) => dispatch({ type: "brightness", seat, to })}
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
            detail="Phones and headphones"
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
      </div>
      <p className={s.fine}>
        AVENUE reference implementation, web. Platform integration is scoped with each partner.
      </p>
    </div>
  );
}
