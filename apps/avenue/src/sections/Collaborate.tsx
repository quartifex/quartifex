// Collaboration: who AVENUE is for, the three ways to work with us, what a partner gets, and
// the form. No prices, no checkout, no invented partners.

import s from "./Collaborate.module.css";
import { PartnerForm } from "./PartnerForm";

const FOR = [
  "EV and mobility start-ups building their first cabin",
  "Carmakers' UX teams exploring rear-seat and whole-car systems",
  "Tier-1 suppliers pairing displays with a ready interface",
  "Coachbuilders and chauffeur or fleet operators",
];

export const MODELS = [
  {
    id: "licence",
    name: "Design-system licence",
    text: "Use AVENUE's tokens, components and interaction, motion and safety rules in your own product, with our support while your team adopts them.",
  },
  {
    id: "pilot",
    name: "Co-develop a pilot",
    text: "Build AVENUE into a test vehicle or a buck with us: the seat modes, your signals and hardware, and a driver-mode test plan.",
  },
  {
    id: "custom",
    name: "Custom adaptation",
    text: "Reshape AVENUE for your brand, your cabin and your passengers: new modules, new seat layouts, new markets.",
  },
] as const;

const GETS = [
  ["Design system", "Tokens, components and their states, in design files and code"],
  ["Reference implementation", "The demo's code: shared state, seat modes, the driver rules"],
  ["Documentation", "Architecture, modules, safety and accessibility, as on this page"],
  ["Design support", "Our designers alongside your team through integration and testing"],
] as const;

export function Collaborate() {
  return (
    <section
      id="partner"
      className={`section headlight ${s.partner}`}
      aria-labelledby="partner-title"
    >
      <div className="grid-lines" aria-hidden="true" />
      <div className={`wrap ${s.grid}`}>
        <div className={s.copy}>
          <p className="eyebrow">P · Partner with us</p>
          <h2 id="partner-title" className="h1" data-split>
            Build the whole-car screen with us.
          </h2>
          <p className="lede">
            AVENUE is offered on a collaboration basis. Tell us about your cabin and we will propose
            a way to work together.
          </p>
          <h3 className={`h3 ${s.sub}`}>For</h3>
          <ul className={s.for}>
            {FOR.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div className={s.models}>
          {MODELS.map((m, i) => (
            <article key={m.id} className={s.model}>
              <span className={`mono ${s.n}`}>0{i + 1}</span>
              <h3 className="h3">{m.name}</h3>
              <p>{m.text}</p>
            </article>
          ))}
        </div>
        <div className={s.gets}>
          <h3 className="h3">What a partner gets</h3>
          <dl>
            {GETS.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <PartnerForm models={MODELS.map(({ id, name }) => ({ id, name }))} />
      </div>
    </section>
  );
}
