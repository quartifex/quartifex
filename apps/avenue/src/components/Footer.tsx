// The footer: the studio that made AVENUE, the ways into quartifex.com, the site's own map,
// the honest labels, and where every asset came from (folded away until asked for).
import { CAR_NOTICE, CREDITS, SITE } from "@/content/site";
import { Arrow } from "./Btn";
import s from "./Footer.module.css";
import { Lockup } from "./Logo";
import { QuartifexMark, QX_EMAIL, QX_SOCIAL, qx } from "./Quartifex";

const EXPLORE = [
  ["Live demo", "#demo"],
  ["For fleets", "#fleets"],
  ["Platform", "#platform"],
  ["Research", "#design"],
  ["Docs", "#docs"],
  ["Partner with us", "#partner"],
] as const;

const STUDIO = [
  ["Quartifex", "/"],
  ["The AVENUE case study", "/work/avenue"],
  ["Work", "/work"],
  ["Studio", "/studio"],
  ["Capabilities", "/capabilities"],
  ["Contact", "/contact"],
] as const;

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`wrap ${s.studioBand}`}>
        <a className={s.studioMark} href={qx("/", "footer-mark")} rel="noopener">
          <QuartifexMark size={72} title="Quartifex" />
        </a>
        <div className={s.studioText}>
          <p className="eyebrow">Designed and built by Quartifex</p>
          <p className={s.studioLine}>
            AVENUE is a Quartifex system.{" "}
            <span className="muted">
              Have a cabin, a fleet or a product that needs the same care? Talk to the studio.
            </span>
          </p>
          <div className={s.studioActions}>
            <a className="btn" href={qx("/contact", "footer-contact")} rel="noopener">
              <span className="btn-label">Start a project</span>
              <span className="btn-arrow">
                <Arrow />
              </span>
            </a>
            <a className={s.ghost} href={qx("/work/avenue", "footer-case")} rel="noopener">
              Read the case study
            </a>
            <a className={s.ghost} href={`mailto:${QX_EMAIL}?subject=Hello%20from%20AVENUE`}>
              {QX_EMAIL}
            </a>
          </div>
        </div>
      </div>

      <div className={`wrap ${s.grid}`}>
        <div className={s.brand}>
          <Lockup height={26} />
          <p className={s.honesty}>{SITE.honesty}</p>
          <p className={s.notice}>{CAR_NOTICE}</p>
        </div>
        <nav aria-label="AVENUE">
          <h2 className={s.heading}>AVENUE</h2>
          <ul className={s.links}>
            {EXPLORE.map(([name, href]) => (
              <li key={href}>
                <a href={href}>{name}</a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Quartifex">
          <h2 className={s.heading}>Quartifex</h2>
          <ul className={s.links}>
            {STUDIO.map(([name, path]) => (
              <li key={path}>
                <a href={qx(path, "footer-nav")} rel="noopener">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Follow Quartifex">
          <h2 className={s.heading}>Follow</h2>
          <ul className={s.links}>
            {QX_SOCIAL.map((n) => (
              <li key={n.name}>
                <a href={n.url} rel="noopener">
                  {n.name}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${QX_EMAIL}`}>{QX_EMAIL}</a>
            </li>
          </ul>
        </nav>
      </div>

      <details className={`wrap ${s.provenance}`}>
        <summary>
          <span className={s.heading}>Provenance</span>
          <span className="muted">Where every model, image, map and sound came from</span>
        </summary>
        <dl className={s.credits}>
          {CREDITS.map((c) => (
            <div key={c.item}>
              <dt>{c.item}</dt>
              <dd>{c.credit}</dd>
            </div>
          ))}
        </dl>
      </details>

      <p className={`wrap ${s.base}`}>
        <span className="label">© 2026 Quartifex · {SITE.label}</span>
        <span className="label">avenue.quartifex.com</span>
      </p>
    </footer>
  );
}
