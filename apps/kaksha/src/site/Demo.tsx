"use client";
// The real app in a phone frame, on its own synthetic database (/app?demo=1).
import { useRef, useState } from "react";
import type { Copy } from "./copy";

export function Demo({ copy, locale }: { copy: Copy["demo"]; locale: "en" | "hi" }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const src = `/app?demo=1&lang=${locale}`;

  const open = (id: string, hash: string) => {
    setActive(id);
    const w = frame.current?.contentWindow;
    if (w) w.location.hash = `#${hash}`;
    frame.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <div className="demo">
      <ol className="demo__tasks">
        {copy.tasks.map((task, i) => (
          <li key={task.id} data-on={active === task.id}>
            <button
              type="button"
              onClick={() => open(task.id, task.hash)}
              aria-pressed={active === task.id}
            >
              <span className="demo__n" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <strong>{task.title}</strong>
                <span>{task.body}</span>
              </span>
            </button>
          </li>
        ))}
        <li>
          <a className="btn-link" href={src}>
            {copy.open} →
          </a>
        </li>
      </ol>
      <div className="phone">
        <div className="phone__screen">
          <iframe ref={frame} src={src} title={copy.frame} loading="lazy" />
        </div>
      </div>
    </div>
  );
}
