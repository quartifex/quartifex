"use client";
// The two front screens that are not touch screens: the head-up display on the windscreen and
// the driver display behind the wheel. Both read the same system as every other screen, show
// only what driving needs, and change with the car (parked or moving). The centre display next
// to them is the seat's full interface (Screen.tsx).
import f from "./front.module.css";
import { Icon } from "./Icon";
import { useSpeed } from "./modules";
import { useSystem } from "./store";
import { JOURNEY, MEDIA_BY_ID, VEHICLE } from "./system";
import { Art } from "./ui";

/** A keep-left arrow, drawn for the windscreen and the driver display. */
function TurnArrow({ className }: { className?: string | undefined }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M30 42V24c0-4-2-6-6-8l-8-4M16 4v8h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The head-up display: speed, the limit and the next turn, floating over the road. */
export function Hud() {
  const moving = useSystem((st) => st.moving);
  const speed = useSpeed(moving);
  return (
    <div className={f.windscreen}>
      <div
        className={f.hud}
        role="img"
        aria-label={
          moving
            ? `Head-up display: ${speed} km/h, limit ${VEHICLE.speedLimit}, ${JOURNEY.next.action.toLowerCase()} in ${JOURNEY.next.distance}`
            : "Head-up display: parked, off until the car moves"
        }
        data-on={moving ? "" : undefined}
      >
        <span className={f.hudSpeed}>
          <b>{speed}</b>
          <small>km/h</small>
        </span>
        <span className={f.hudLimit}>{VEHICLE.speedLimit}</span>
        <span className={f.hudTurn}>
          <TurnArrow className={f.hudArrow} />
          <b>{JOURNEY.next.distance}</b>
        </span>
      </div>
      <span className={f.surfaceLabel}>Head-up display</span>
    </div>
  );
}

/** The driver display: one number per idea, each in the same place every time. */
export function DriverDisplay() {
  const moving = useSystem((st) => st.moving);
  const me = useSystem((st) => st.seats.driver);
  const speed = useSpeed(moving);
  const item = me.nowPlaying ? MEDIA_BY_ID[me.nowPlaying] : undefined;
  const pct = Math.round(VEHICLE.battery * 100);
  return (
    <div className={f.bezel}>
      <section className={f.cluster} aria-label="Driver display" data-moving={moving ? "" : undefined}>
        <div className={f.left}>
          <p className={f.speed}>
            <b>{speed}</b>
            <span>km/h</span>
          </p>
          <p className={f.gears}>
            <span className="sr-only">Gear {moving ? "D" : "P"}: </span>
            {["P", "R", "N", "D"].map((g) => (
              <span key={g} data-on={(moving ? g === "D" : g === "P") ? "" : undefined}>
                {g}
              </span>
            ))}
          </p>
          <p className={f.acc}>
            <Icon name="speed" size="1.1em" />
            {moving ? `ACC ${VEHICLE.setSpeed} · lane keep` : "Assist ready"}
          </p>
        </div>

        <svg
          className={f.lanes}
          viewBox="0 0 200 120"
          role="img"
          aria-label={moving ? "Lane keeping on, a car ahead at a safe distance" : "Parked"}
        >
          <defs>
            <linearGradient id="fd-lane" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#4d7dff" />
              <stop offset="1" stopColor="#4d7dff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M60 120 L94 14 H106 L140 120 Z" fill="url(#fd-lane)" opacity={moving ? 0.22 : 0.08} />
          <path d="M60 120 L94 14" stroke="#4d7dff" strokeWidth="2.5" opacity={moving ? 1 : 0.3} />
          <path d="M140 120 L106 14" stroke="#4d7dff" strokeWidth="2.5" opacity={moving ? 1 : 0.3} />
          <path d="M10 120 L78 14" stroke="rgb(255 255 255 / 0.16)" strokeWidth="2" strokeDasharray="7 8" />
          <path d="M190 120 L122 14" stroke="rgb(255 255 255 / 0.16)" strokeWidth="2" strokeDasharray="7 8" />
          {moving ? <path d="M88 56 h24 l-2.5 -11 h-19 Z" fill="rgb(255 255 255 / 0.6)" /> : null}
          <path d="M82 116 h36 l-4.5 -20 h-27 Z" fill="#f2f5fa" />
        </svg>

        <div className={f.right}>
          <div className={f.turn}>
            <TurnArrow className={f.turnArrow} />
            <p>
              <b>{JOURNEY.next.distance}</b>
              <span>{JOURNEY.next.road}</span>
            </p>
          </div>
          <p className={f.eta}>
            <span>
              Arrive <b>{JOURNEY.arrive}</b>
            </span>
            <span>{JOURNEY.etaMinutes} min</span>
          </p>
          <div className={f.range}>
            <span className={f.rangeBar}>
              <i style={{ width: `${pct}%` }} />
            </span>
            <span>
              <b>{VEHICLE.rangeKm} km</b> · {pct}%
            </span>
          </div>
        </div>

        <p className={f.playing}>
          {item ? (
            <>
              <Art hue={item.hue} seed={item.seed} className={f.art} />
              <span>
                <b>{item.title}</b> {item.by}
              </span>
              {me.playing ? <span className={f.live} aria-label="playing" /> : null}
            </>
          ) : (
            <span>Nothing playing</span>
          )}
        </p>
      </section>
      <span className={f.surfaceLabel}>Driver display</span>
    </div>
  );
}
