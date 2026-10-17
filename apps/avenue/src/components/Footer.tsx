// The footer: the lockup, the honest labels, where every asset came from, and the studio.
import { CAR_NOTICE, CREDITS, SITE } from "@/content/site";
import s from "./Footer.module.css";
import { Lockup } from "./Logo";

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`wrap ${s.grid}`}>
        <div className={s.brand}>
          <Lockup height={28} />
          <p className={s.honesty}>{SITE.honesty}</p>
          <p className={s.notice}>{CAR_NOTICE}</p>
          <p className={s.studio}>
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
      <p className={`wrap ${s.base}`}>
        <span className="label">{SITE.label}</span>
        <span className="label">avenue.quartifex.com</span>
      </p>
    </footer>
  );
}
