"use client";
// The live demo, on a stage of its own (the car steps aside): one seat's screen in a device, with
// the seat switcher and the car controls under it like a console, and every seat at a glance
// below. Changing seat dims the screen, swaps it and brings it back up; under reduced motion it
// simply changes. The Parked / Moving switch shows the driver lockout.
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ByQuartifex } from "@/components/Quartifex";
import { MODULE_BY_ID, type ModuleId } from "@/content/modules";
import { VIDEO_BY_ID } from "@/content/youtube";
import { useReducedMotion } from "@/lib/scroll";
import { useStore } from "@/lib/store";
import { stage } from "@/stage/state";
import s from "./demo.module.css";
import { Icon } from "./Icon";
import { Screen } from "./Screen";
import { dispatch, useSystem } from "./store";
import { MEDIA_BY_ID, SEAT_IDS, SEAT_NAME, type SeatId } from "./system";

function useTicker() {
  // Advance whatever is playing on every screen, once a second, while the demo is on screen.
  const on = useStore(stage, (st) => st.demo);
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => dispatch({ type: "tick", seconds: 1 }), 1000);
    return () => window.clearInterval(id);
  }, [on]);
}

function SeatSwitcher({ seat, onSelect }: { seat: SeatId; onSelect: (s: SeatId) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const indicator = useRef<HTMLSpanElement>(null);
  const level = useReducedMotion() ? "reduced" : "full";
  const previous = useRef<ReturnType<typeof Flip.getState> | null>(null);
  // The selection pill slides to the chosen seat (Flip), or moves at once under reduced motion.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each seat change, when the new pill has rendered
  useLayoutEffect(() => {
    const state = previous.current;
    if (state && indicator.current && level === "full") {
      Flip.from(state, { duration: 0.45, ease: "power3.inOut" });
    }
  }, [seat, level]);
  const select = (next: SeatId) => {
    if (indicator.current) previous.current = Flip.getState(indicator.current);
    onSelect(next);
  };
  const onKey = (e: KeyboardEvent) => {
    const i = SEAT_IDS.indexOf(seat);
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = SEAT_IDS[(i + delta + SEAT_IDS.length) % SEAT_IDS.length] as SeatId;
    select(next);
    refs.current[SEAT_IDS.indexOf(next)]?.focus();
  };
  return (
    <div className={s.switcher} role="radiogroup" aria-label="Seat" onKeyDown={onKey}>
      {SEAT_IDS.map((id, i) => (
        // biome-ignore lint/a11y/useSemanticElements: a segmented control: buttons in a radiogroup with roving focus and arrow keys
        <button
          key={id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={id === seat}
          tabIndex={id === seat ? 0 : -1}
          className={s.seatOption}
          onClick={() => select(id)}
        >
          {id === seat ? (
            <span ref={indicator} className={s.seatIndicator} data-flip-id="seat" />
          ) : null}
          <span className={s.seatOptionLabel}>{SEAT_NAME[id]}</span>
          <span className={s.seatOptionTag}>User-tested</span>
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<readonly [boolean, string]>;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = `toggle-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className={s.toggle}>
      <span id={id} className={s.controlLabel}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className={s.toggleGroup}>
        {options.map(([v, text]) => (
          // biome-ignore lint/a11y/useSemanticElements: a segmented control: buttons in a radiogroup with roving focus and arrow keys
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={value === v}
            tabIndex={value === v ? 0 : -1}
            className={s.toggleOption}
            data-tone={v && label === "Car" ? "ember" : undefined}
            onClick={() => onChange(v)}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
                e.preventDefault();
                onChange(!value);
                const sibling = e.currentTarget.parentElement?.children[value ? 0 : 1] as
                  | HTMLElement
                  | undefined;
                sibling?.focus();
              }
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function CarControls() {
  const moving = useSystem((st) => st.moving);
  const fleet = useSystem((st) => st.fleet);
  return (
    <div className={s.carControls}>
      <Toggle
        label="Car"
        options={[
          [false, "Parked"],
          [true, "Moving"],
        ]}
        value={moving}
        onChange={(on) => dispatch({ type: "moving", on })}
      />
      <Toggle
        label="Use"
        options={[
          [false, "Private"],
          [true, "Cab"],
        ]}
        value={fleet}
        onChange={(on) => dispatch({ type: "fleet", on })}
      />
    </div>
  );
}

const STRIP_LABEL: Partial<Record<ModuleId, string>> = {
  journey: "Maps",
  apps: "All apps",
  app: "An app from the store",
};

/** The other seats at a glance: what each is showing, and what is waiting for it. */
function SystemStrip({ seat, onSelect }: { seat: SeatId; onSelect: (s: SeatId) => void }) {
  const seats = useSystem((st) => st.seats);
  return (
    <ul className={s.strip} aria-label="All four screens">
      {SEAT_IDS.map((id) => {
        const st = seats[id];
        const item = st.nowPlaying ? MEDIA_BY_ID[st.nowPlaying] : undefined;
        return (
          <li key={id}>
            <button
              type="button"
              className={s.stripItem}
              aria-current={id === seat ? "true" : undefined}
              onClick={() => onSelect(id)}
            >
              <span className={s.stripSeat}>{SEAT_NAME[id]}</span>
              <span className={s.stripWhat}>
                {st.video
                  ? (VIDEO_BY_ID[st.video]?.title ?? "YouTube")
                  : st.playing && item
                    ? `${item.title}`
                    : (STRIP_LABEL[st.module] ?? MODULE_BY_ID[st.module]?.name ?? st.module)}
              </span>
              {st.video || (st.playing && item) ? (
                <span className={s.stripLive} aria-hidden="true" />
              ) : null}
              {st.inbox.length ? (
                <span className={s.stripBadge}>{st.inbox.length} sent to it</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Announcer() {
  const notice = useSystem((st) => st.notice);
  return (
    <p className="sr-only" aria-live="polite" role="status">
      {/* A trailing zero-width space on alternate notices, so a repeated message is re-read. */}
      {notice.text ? `${notice.text}${notice.n % 2 ? "​" : ""}` : ""}
    </p>
  );
}

function VisibleNotice() {
  const notice = useSystem((st) => st.notice);
  const [shown, setShown] = useState<typeof notice | null>(null);
  useEffect(() => {
    if (!notice.text) return;
    setShown(notice);
    const id = window.setTimeout(() => setShown(null), 4200);
    return () => window.clearTimeout(id);
  }, [notice]);
  return (
    <p className={s.notice} data-shown={shown ? "" : undefined} aria-hidden="true">
      <Icon name="check" size="1.1em" />
      {shown?.text}
    </p>
  );
}

export function Demo() {
  const seat = useStore(stage, (st) => st.seat);
  const active = useStore(stage, (st) => st.demo);
  const panel = useRef<HTMLDivElement>(null);
  const [shownSeat, setShownSeat] = useState<SeatId>(seat);
  const level = useReducedMotion() ? "reduced" : "full";
  useTicker();

  // The device rises into place when the section arrives.
  useEffect(() => {
    const el = panel.current;
    if (!el || !active) return;
    if (level !== "full") {
      gsap.set(el, { autoAlpha: 1, y: 0, scale: 1 });
      return;
    }
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 36, scale: 0.97 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: "expo.out" },
    );
  }, [active, level]);

  // Another seat: the screen dims, changes, and comes back up.
  const select = (next: SeatId) => {
    if (next === seat) return;
    stage.set({ seat: next });
    const el = panel.current?.querySelector<HTMLElement>("[data-screen]");
    if (!el || level !== "full") {
      setShownSeat(next);
      return;
    }
    gsap
      .timeline()
      .to(el, { autoAlpha: 0, scale: 0.985, duration: 0.18, ease: "power2.in" })
      .add(() => setShownSeat(next))
      .to(el, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "expo.out" });
  };

  return (
    <section
      id="demo"
      data-snap
      data-chapter="demo"
      className={`section ${s.demo}`}
      aria-labelledby="demo-title"
    >
      <div className={`wrap ${s.head}`}>
        <div>
          <p className="eyebrow">D · The live demo</p>
          <h2 id="demo-title" className={`h1 ${s.title}`}>
            Take any seat. <span className="muted">Every screen is real.</span>
          </h2>
        </div>
        <p className={s.intro}>
          The car is moving, so the driver&rsquo;s screen is in glance mode. Park it to see what
          unlocks, take another seat, send something to the back, or switch to cab mode for the
          rider&rsquo;s screen. Everything works from the keyboard.
        </p>
      </div>
      <div className={s.stage}>
        <div ref={panel} className={s.device}>
          <div className={s.panel} data-screen>
            <Screen seat={shownSeat} />
            <VisibleNotice />
          </div>
        </div>
      </div>
      <div className={`wrap ${s.controls}`}>
        <SeatSwitcher seat={seat} onSelect={select} />
        <CarControls />
      </div>
      <div className={`wrap ${s.foot}`}>
        <SystemStrip seat={seat} onSelect={select} />
        <div className={s.footRow}>
          <p className={s.honesty}>
            {seat === "driver" || seat === "copilot"
              ? `${SEAT_NAME[seat]} mode: researched and user-tested.`
              : "Rear-seat modules: researched and user-tested, with the A/B test below."}{" "}
            Titles, places and news are invented for the demo; SOS places no call.
          </p>
          <ByQuartifex content="demo" />
        </div>
      </div>
      <Announcer />
    </section>
  );
}
