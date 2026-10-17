// The footer: the placeholder wordmark, the honest label, where everything came from, and
// the studio.
import Image from "next/image";
import { CREDITS, SITE } from "@/content/site";
import s from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`wrap ${s.grid}`}>
        <div className={s.brand}>
          <Image
            src="/brand/avenue-logo.svg"
            alt="AVENUE"
            width={220}
            height={25}
            unoptimized
            className={s.logo}
          />
          <p className={s.honesty}>{SITE.honesty}</p>
          <p className={s.label}>
            <span className="mono">{SITE.label}</span>
          </p>
          <p>
            A Quartifex product.{" "}
            <a href={SITE.studio.url} rel="noopener">
              quartifex.com
            </a>
          </p>
        </div>
        <div>
          <h2 className={s.heading}>Provenance</h2>
          <dl className={s.credits}>
            {CREDITS.map((c) => (
              <div key={c.item}>
                <dt>{c.item}</dt>
                <dd>{c.credit}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </footer>
  );
}
