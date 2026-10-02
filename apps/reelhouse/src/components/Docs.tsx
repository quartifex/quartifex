// The docs: the pipeline in one line, then each library with its job, its quickstart and its
// links. The full references live in each package's README; these are the parts you need on
// day one.
import styles from "./Docs.module.css";

const REPO = "https://github.com/quartifex/quartifex/tree/main/packages";
const LAB = "https://lab.quartifex.com";

const LIBRARIES = [
  {
    name: "rushes",
    id: "L02",
    job: "Encode",
    what: "One command turns a video or a frame folder (a Blender render, an export) into tiered AVIF and WebP frames, posters, a manifest.json and a page-weight report against a budget.",
    code: `npx rushes clip.mp4 --out public/sequences/clip \\
  --widths 480,960,1600 --budget budget.json --strict`,
    notes: [
      "Video needs ffmpeg on the PATH (or --ffmpeg); frame folders do not.",
      "Tiers up to 640 px keep every second frame, so phones download less.",
      "In the browser, @quartifex/rushes/browser encodes previews, as in the playground above.",
    ],
  },
  {
    name: "reel",
    id: "L01",
    job: "Play",
    what: "Plays a rushes sequence on a canvas against the scroll: the tier resolve picks for this screen, the current frame first, a bounded buffer, the nearest frame while the exact one loads.",
    code: `import { bindScroll, createReel, loadManifest } from "@quartifex/reel";

const manifest = await loadManifest("/sequences/clip/manifest.json");
const reel = createReel(canvas, manifest, { baseUrl: "/sequences/clip/" });
bindScroll(reel, document.querySelector("#scene"));`,
    notes: [
      "GSAP is optional: scrubReel(reel, ScrollTrigger) from @quartifex/reel/gsap.",
      "Under reduced motion it shows the poster and loads no frames.",
      "urlFor maps frame paths to any URL: a CDN, signed links, object URLs.",
    ],
  },
  {
    name: "heft",
    id: "L03",
    job: "Weigh",
    what: "Holds a page to its budget: weighs sequences, models and textures in the build, then loads, scrolls and clicks the page to measure transfer, long frames, layout shift and input delay.",
    code: `npx heft --budget budget.json --dir public --url http://localhost:3000
# exit 1 when over; a GitHub Action is included`,
    notes: [
      "Budgets live in budget.json, per app, next to your code.",
      "@quartifex/heft/browser has the evaluator and collectors for live dashboards.",
    ],
  },
  {
    name: "viewfinder",
    id: "L05",
    job: "Inspect",
    what: "A development overlay for scroll scenes: every ScrollTrigger and reel on the page, live progress, frames in memory, chapter jumps, and recorded scroll paths you can replay.",
    code: `import { createViewfinder } from "@quartifex/viewfinder";
import { reelSource } from "@quartifex/viewfinder/reel";

createViewfinder({ sources: [reelSource(reel, "hero")] }); // Alt+V`,
    notes: [
      "Mount it in development or behind a flag; it is not meant for visitors.",
      "Open it on the playground's player to watch reel's buffer fill.",
    ],
  },
] as const;

export function Docs() {
  return (
    <section id="docs" className={styles.section} aria-labelledby="docs-title">
      <header className={styles.head}>
        <p className="mono">Docs</p>
        <h2 id="docs-title" className={styles.h2}>
          Four small libraries, one pipeline.
        </h2>
        <Pipeline />
      </header>
      <div className={styles.libs}>
        {LIBRARIES.map((lib) => (
          <article
            key={lib.name}
            id={lib.name}
            className={styles.lib}
            aria-labelledby={`${lib.name}-title`}
          >
            <header className={styles.libHead}>
              <p className="mono">
                {lib.id} · {lib.job}
              </p>
              <h3 id={`${lib.name}-title`} className={styles.h3}>
                @quartifex/{lib.name}
              </h3>
            </header>
            <p className={styles.what}>{lib.what}</p>
            <pre className={styles.code}>
              <code>{lib.code}</code>
            </pre>
            <ul className={styles.notes}>
              {lib.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <p className={styles.links}>
              <a href={`${REPO}/${lib.name}#readme`}>
                README<span className="visually-hidden"> for {lib.name}</span>
              </a>
              <a href={`${LAB}/${lib.name}`}>
                Live demo in the Lab<span className="visually-hidden"> for {lib.name}</span>
              </a>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/** The pipeline as a hairline diagram: footage, rushes, the manifest and tiers, reel, heft. */
function Pipeline() {
  const steps = ["footage", "rushes", "tiers + manifest", "reel", "heft"];
  return (
    <ol className={styles.pipeline} aria-label="The pipeline">
      {steps.map((s, i) => (
        <li key={s} data-lib={i === 1 || i === 3 || i === 4 || undefined}>
          {s}
        </li>
      ))}
    </ol>
  );
}
