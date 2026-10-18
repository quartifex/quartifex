// The studio behind AVENUE: the Quartifex mark (from quartifex.com/icon.svg), a "by Quartifex"
// credit for the places it belongs, and links into quartifex.com tagged so the studio can see
// they came from here.
import s from "./Quartifex.module.css";

const SQUARES: Array<[number, number, number]> = [
  [457.8, 134.0, 0],
  [619.7, 177.4, 30],
  [738.2, 295.9, 60],
  [781.6, 457.8, 90],
  [457.8, 781.6, 180],
  [295.9, 738.2, 210],
  [177.4, 619.7, 240],
  [134.0, 457.8, 270],
  [177.4, 295.9, 300],
  [295.9, 177.4, 330],
];

/** quartifex.com links, tagged with where they came from. */
export const qx = (path = "/", content = "site") =>
  `https://quartifex.com${path}?utm_source=avenue&utm_medium=referral&utm_campaign=avenue&utm_content=${content}`;

export const QX_EMAIL = "hello@quartifex.com";

export const QX_SOCIAL = [
  { name: "LinkedIn", url: "https://www.linkedin.com/company/quartifex/" },
  { name: "Instagram", url: "https://www.instagram.com/quartifex/" },
  { name: "X", url: "https://x.com/quartifex" },
] as const;

export function QuartifexMark({ size = 28, title }: { size?: number; title?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={s.mark}
    >
      <defs>
        <linearGradient id="qx-g" x1="0.08" y1="0" x2="0.92" y2="1">
          <stop offset="0" stopColor="#ff5558" />
          <stop offset=".55" stopColor="#f2273f" />
          <stop offset="1" stopColor="#c60225" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="278" fill="url(#qx-g)" />
      <g fill="#fbfaf8">
        {SQUARES.map(([x, y, r]) => (
          <rect
            key={r}
            x={x}
            y={y}
            width="108.4"
            height="108.4"
            transform={`rotate(${r} ${x + 54.2} ${y + 54.2})`}
          />
        ))}
        <polygon points="890.0,824.4 890.0,888.8 826.2,889.7 747.7,812.6 654.5,865.9 558.0,626.3 515.6,521.0 512.0,512.0 613.5,552.8 865.9,654.2 811.9,747.7 890.0,824.4" />
      </g>
    </svg>
  );
}

/** "Designed and built by Quartifex", linking to the studio. */
export function ByQuartifex({
  content = "credit",
  label = "Designed and built by",
  tone,
}: {
  content?: string;
  label?: string;
  tone?: "paper";
}) {
  return (
    <a
      className={s.by}
      href={qx("/work/avenue", content)}
      rel="noopener"
      data-tone={tone}
      aria-label={`${label} Quartifex: the AVENUE case study on quartifex.com`}
    >
      <QuartifexMark size={22} />
      <span>
        {label} <strong>Quartifex</strong>
      </span>
    </a>
  );
}
