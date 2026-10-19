// Phone screens drawn in markup, from the app's own design. They are pictures of the
// app (aria-hidden); the real thing runs in the demo. No raster images.
import type { ReactNode } from "react";
import type { Copy } from "./copy";

type M = Copy["mock"];

export function Phone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`pm ${className}`}>
      <div className="pm__screen" aria-hidden="true">
        <div className="pm__status">
          <span>9:41</span>
          <span className="pm__dots">
            <i />
            <i />
            <i />
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Mark({ size = 26 }: { size?: number }) {
  return (
    // biome-ignore lint/performance/noImgElement: the brand mark, a small static SVG
    <img src="/brand/mark.svg" width={size} height={size} alt="" className="pm__mark" />
  );
}

function Tabs({ m, on = 0 }: { m: M; on?: number }) {
  return (
    <div className="pm__tabs">
      {m.tabs.map((x, i) => (
        <span key={x} data-on={i === on}>
          <b />
          {x}
        </span>
      ))}
    </div>
  );
}

export function MockToday({ m }: { m: M }) {
  return (
    <>
      <div className="pm__body">
        <div className="pm__head">
          <div>
            <small className="pm__kicker">{m.date}</small>
            <strong className="pm__title">{m.hello}</strong>
          </div>
          <Mark />
        </div>
        <span className="pm__status-pill">
          <i />
          {m.saved}
        </span>
        <div className="pm__hero">
          <small>{m.cont}</small>
          <strong>{m.test}</strong>
          <span>{m.meta}</span>
          <div className="pm__bar">
            <span>
              <i style={{ width: "33%" }} />
            </span>
            <em>{m.of}</em>
          </div>
          <b className="pm__btn">{m.contWith}</b>
        </div>
        <div className="pm__row-head">
          <strong>{m.ready}</strong>
          <small>{m.seeAll}</small>
        </div>
        <div className="pm__list">
          <div>
            <i>4B</i>
            <span>
              <strong>{m.r1}</strong>
              <small>{m.r1m}</small>
            </span>
            <em>72%</em>
          </div>
          <div>
            <i>5A</i>
            <span>
              <strong>{m.r2}</strong>
              <small>{m.r2m}</small>
            </span>
            <em>65%</em>
          </div>
        </div>
        <div className="pm__warn">{m.backup}</div>
      </div>
      <Tabs m={m} />
    </>
  );
}

export function MockMark({ m }: { m: M }) {
  return (
    <div className="pm__body">
      <div className="pm__seg">
        <span data-on="true">{m.byQ}</span>
        <span>{m.byS}</span>
      </div>
      <div className="pm__q">
        <strong>{m.q}</strong>
        <span>
          {m.key} · {m.skill}
        </span>
      </div>
      <div className="pm__who">
        <i>05</i>
        <span>
          <strong>{m.child}</strong>
          <small>{m.ask}</small>
        </span>
      </div>
      <div className="pm__strip">
        {["B", "D", "C", "", "", "", ""].map((v, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed picture
          <span key={i} data-on={i === 3}>
            {v || "·"}
          </span>
        ))}
      </div>
      <div className="pm__keys">
        {["A", "B", "C", "D"].map((k) => (
          <span key={k} data-on={k === "C"}>
            {k}
          </span>
        ))}
      </div>
      <div className="pm__keys pm__keys--small">
        <span>{m.blank}</span>
        <span>{m.absent}</span>
        <span>↶ {m.undo}</span>
      </div>
    </div>
  );
}

export function MockWelcome({ m }: { m: M }) {
  return (
    <div className="pm__body pm__body--welcome">
      <Mark size={40} />
      <strong className="pm__hello">
        <span lang="hi">नमस्ते!</span>
        <span lang="en">Hello!</span>
      </strong>
      <small>{m.welcomeLead}</small>
      <small className="pm__kicker">{m.choose}</small>
      <div className="pm__choice">
        <span lang="hi">हिन्दी</span>
      </div>
      <div className="pm__choice" data-on="true">
        <span>English</span>
        <i>✓</i>
      </div>
      <b className="pm__btn pm__btn--ink">{m.continue}</b>
    </div>
  );
}
