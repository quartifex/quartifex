"use client";
// The live demo. When its section arrives the camera settles on a seat and that seat's screen
// grows out of the 3D cabin into a full-size, keyboard-usable interface (a GSAP Flip from the
// screen's rectangle on the page). The seat switcher folds the panel back into its screen,
// flies the camera to the next seat, and grows that seat's screen out. Under reduced motion,
// or without real-time 3D, it cuts instead. The Parked / Moving switch shows the driver lockout.
import { useStillness } from "@quartifex/stillness/react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { frame, stage } from "@/stage/state";
import s from "./demo.module.css";
import { Icon } from "./Icon";
import { Screen } from "./Screen";
import { dispatch, useSystem } from "./store";
import { MEDIA_BY_ID, SEAT_IDS, SEAT_NAME, type SeatId } from "./system";

const TESTED: Record<SeatId, boolean> = {
  driver: false,
  copilot: false,
  rearLeft: true,
  rearRight: true,
};

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
  const { level } = useStillness();
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
          <span className={s.seatOptionTag}>{TESTED[id] ? "User-tested" : "Extension"}</span>
        </button>
      ))}
    </div>
  );
}

function MovingSwitch() {
  const moving = useSystem((st) => st.moving);
  return (
    <div className={s.movingSwitch}>
      <span id="moving-label" className={s.controlLabel}>
        Car
      </span>
      <div role="radiogroup" aria-labelledby="moving-label" className={s.segmented}>
        {(
          [
            [false, "Parked"],
            [true, "Moving"],
          ] as const
        ).map(([value, label]) => (
          // biome-ignore lint/a11y/useSemanticElements: a segmented control: buttons in a radiogroup with roving focus and arrow keys
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={moving === value}
            tabIndex={moving === value ? 0 : -1}
            className={s.segment}
            onClick={() => dispatch({ type: "moving", on: value })}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
                e.preventDefault();
                dispatch({ type: "moving", on: !moving });
                const sibling =
                  (e.currentTarget.parentElement?.children[moving ? 0 : 1] as
                    | HTMLElement
                    | undefined) ?? null;
                sibling?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
                {st.playing && item
                  ? `${item.title}`
                  : st.module[0]?.toUpperCase() + st.module.slice(1)}
              </span>
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
  const rung = useStore(stage, (st) => st.rung);
  const ready = useStore(stage, (st) => st.ready);
  const panel = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const [shownSeat, setShownSeat] = useState<SeatId>(seat);
  const { level } = useStillness();
  const flying = rung === "webgl" && ready && level === "full";
  useTicker();

  // The anchor follows the selected screen on the page, every frame, without re-rendering.
  useEffect(() => {
    frame.onRect = (r) => {
      const el = anchor.current;
      const host = el?.offsetParent as HTMLElement | null;
      if (!el || !host) return;
      const box = host.getBoundingClientRect();
      el.style.transform = `translate(${r.x - box.left}px, ${r.y - box.top}px)`;
      el.style.width = `${Math.max(1, r.width)}px`;
      el.style.height = `${Math.max(1, r.height)}px`;
    };
    return () => {
      frame.onRect = null;
    };
  }, []);

  // Grow out of the screen when the demo arrives.
  useEffect(() => {
    const el = panel.current;
    const from = anchor.current;
    if (!el || !from || !active) return;
    if (!flying) {
      gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: level === "full" ? 0.4 : 0.01 });
      return;
    }
    // Wait for the camera to land, then grow from where the screen is.
    const t = window.setTimeout(() => {
      const vars = Flip.fit(el, from, { scale: true, getVars: true }) as gsap.TweenVars;
      gsap.fromTo(
        el,
        { ...vars, autoAlpha: 0.6 },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, autoAlpha: 1, duration: 0.85, ease: "expo.inOut" },
      );
    }, 950);
    return () => window.clearTimeout(t);
  }, [active, flying, level]);

  const select = (next: SeatId) => {
    if (next === seat) return;
    const el = panel.current;
    const to = anchor.current;
    if (!el || !to || !flying || !active) {
      stage.set({ seat: next });
      setShownSeat(next);
      if (el)
        gsap.fromTo(
          el,
          { autoAlpha: 0.4 },
          { autoAlpha: 1, duration: level === "full" ? 0.25 : 0.01 },
        );
      return;
    }
    // Fold into this screen, fly, then grow out of the next one.
    const fold = Flip.fit(el, to, { scale: true, getVars: true }) as gsap.TweenVars;
    gsap
      .timeline()
      .to(el, { ...fold, autoAlpha: 0.5, duration: 0.5, ease: "expo.in" })
      .add(() => {
        stage.set({ seat: next });
        setShownSeat(next);
      })
      .to(el, { autoAlpha: 0, duration: 0.12 })
      .add(() => {
        const grow = Flip.fit(el, to, { scale: true, getVars: true }) as gsap.TweenVars;
        gsap.fromTo(
          el,
          { ...grow, autoAlpha: 0.6 },
          { x: 0, y: 0, scaleX: 1, scaleY: 1, autoAlpha: 1, duration: 0.8, ease: "expo.out" },
        );
      }, "+=1.0");
  };

  return (
    <section id="demo" className={`section ${s.demo}`} aria-labelledby="demo-title">
      <div className={`wrap ${s.head}`}>
        <div>
          <p className="eyebrow">The live demo</p>
          <h2 id="demo-title" className="h2">
            Take any seat.
          </h2>
        </div>
        <p className={s.intro}>
          Choose a seat and its screen opens up. Try the driver&rsquo;s seat, then set the car
          moving to see what locks, and send something to the back. Everything works from the
          keyboard.
        </p>
      </div>
      <div className={`wrap ${s.controls}`}>
        <SeatSwitcher seat={seat} onSelect={select} />
        <MovingSwitch />
      </div>
      <div className={s.stage}>
        <div ref={anchor} className={s.anchor} aria-hidden="true" />
        <div ref={panel} className={s.panel}>
          <Screen seat={shownSeat} />
          <VisibleNotice />
        </div>
      </div>
      <div className={`wrap ${s.foot}`}>
        <SystemStrip seat={seat} onSelect={select} />
        <p className={s.honesty}>
          {TESTED[seat]
            ? "Rear-seat modules: researched and user-tested (A/B, rear seat only)."
            : `${SEAT_NAME[seat]} mode: a design extension, not yet user-tested.`}{" "}
          Titles, places and news are invented for the demo; SOS places no call.
        </p>
      </div>
      <Announcer />
    </section>
  );
}
