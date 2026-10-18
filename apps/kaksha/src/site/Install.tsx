"use client";
import { useState } from "react";
import type { Copy } from "./copy";

export function Install({ copy, shots }: { copy: Copy["install"]; shots: string[] }) {
  const [tab, setTab] = useState(copy.tabs[0]?.id ?? "android");
  const current = copy.tabs.find((t) => t.id === tab) ?? copy.tabs[0];
  return (
    <div className="install">
      <div className="install__slip">
        <div className="install__tabs" role="tablist" aria-label={copy.title}>
          {copy.tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`inst-${t.id}`}
              aria-selected={t.id === tab}
              aria-controls="inst-panel"
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div id="inst-panel" role="tabpanel" aria-labelledby={`inst-${tab}`}>
          <ol className="install__steps">
            {current?.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      </div>
      {shots.length ? (
        <figure className="install__shots">
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable */}
          <section tabIndex={0} aria-label={copy.shots}>
            {shots.map((src) => (
              // biome-ignore lint/performance/noImgElement: pre-sized WebP captures of the app
              <img
                key={src}
                src={src}
                width={360}
                height={760}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ))}
          </section>
          <figcaption>{copy.shots}</figcaption>
        </figure>
      ) : null}
    </div>
  );
}
