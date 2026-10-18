"use client";
import { type ReactNode, useState } from "react";
import type { Copy } from "./copy";

export function Install({ copy, phones }: { copy: Copy["install"]; phones: ReactNode }) {
  const [tab, setTab] = useState(copy.tabs[0]?.id ?? "android");
  const current = copy.tabs.find((t) => t.id === tab) ?? copy.tabs[0];
  return (
    <div className="install">
      <div className="install__text">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="install-h" className="section-title">
          {copy.title}
        </h2>
        <p className="lead">{copy.body}</p>
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
      <figure className="install__phones" aria-label={copy.phones}>
        {phones}
      </figure>
    </div>
  );
}
