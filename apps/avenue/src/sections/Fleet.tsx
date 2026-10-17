"use client";
// For fleets: AVENUE in a cab. The rear screens become the rider's screen (trip and ETA, pull
// over, rider support, quiet ride, their own climate and music), the driver keeps glance mode,
// and every ride starts clean. The live rider screen here is the demo's own, in cab mode.
import { Arrow } from "@/components/Btn";
import { MARKET } from "@/content/platform";
import cabin from "@/demo/cabin.module.css";
import { RideHome } from "@/demo/modules";
import { dispatch } from "@/demo/store";
import { scrollToTarget } from "@/lib/scroll";
import { stage } from "@/stage/state";
import s from "./Fleet.module.css";

const RIDER = [
  ["Trip, live", "Where you are, the time you arrive, the road it takes."],
  ["Pull over", "Ask for a stop; the car or the driver finds a safe place."],
  ["Rider support", "A person on the line from the back seat, not a phone menu."],
  ["Quiet ride", "Tell the driver you would rather not chat, without saying it."],
  ["Your zone", "Temperature, seat and music for your seat only."],
] as const;

const OPERATOR = [
  ["Every ride starts clean", "Sign-ins, history and settings clear when the trip ends."],
  ["The driver stays in glance mode", "Rider requests reach the driver as short, spoken prompts."],
  ["One fleet configuration", "Routines, stations and branding set once, for every car."],
  ["Private by default", "No cabin recording, no usage data unless the operator opts in."],
] as const;

export function Fleet() {
  const tryIt = () => {
    dispatch({ type: "fleet", on: true });
    stage.set({ seat: "rearLeft" });
    scrollToTarget("#demo");
  };
  return (
    <section id="fleets" className={`section headlight ${s.fleet}`} aria-labelledby="fleet-title">
      <div className="grid-lines" aria-hidden="true" />
      <div className={`wrap ${s.grid}`}>
        <header className={s.head}>
          <p className="eyebrow">F · For fleets</p>
          <h2 id="fleet-title" className="h1" data-split>
            Every cab, <span className="kw">a first-class</span> cabin.
          </h2>
          <p className="lede">
            Ride-hailing and chauffeur fleets put strangers in the back seat every hour. AVENUE
            gives them the screen a robotaxi rider gets, in the cars you already run, and keeps the
            driver&rsquo;s eyes on the road.
          </p>
          <div className={s.lists}>
            <div>
              <p className="label">For the rider</p>
              <ul>
                {RIDER.map(([t, d]) => (
                  <li key={t}>
                    <strong>{t}</strong>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label">For the operator</p>
              <ul>
                {OPERATOR.map(([t, d]) => (
                  <li key={t}>
                    <strong>{t}</strong>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className={s.actions}>
            <button type="button" className="btn" onClick={tryIt}>
              <span className="btn-label">Try cab mode in the demo</span>
              <span className="btn-arrow">
                <Arrow />
              </span>
            </button>
            <span className="tag" data-status="extension">
              Cab mode: design extension, not yet user-tested
            </span>
          </div>
        </header>
        <div className={s.device} data-reveal>
          <div className={s.deviceFrame} aria-hidden="true">
            <div className={`${cabin.os} ${s.preview}`} data-seat="rearLeft" inert>
              <div className={cabin.main} style={{ gridArea: "1 / 1 / -1 / -1" }}>
                <RideHome seat="rearLeft" />
              </div>
            </div>
          </div>
          <p className={s.caption}>The rider&rsquo;s screen, live from the demo.</p>
        </div>
      </div>
      <div className={`wrap ${s.market}`}>
        <p className="label">What cars already put in front of each seat</p>
        <ul>
          {MARKET.map((m) => (
            <li key={m.who}>
              <strong>{m.who}</strong>
              <span>{m.what}</span>
              <small>{m.source}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
