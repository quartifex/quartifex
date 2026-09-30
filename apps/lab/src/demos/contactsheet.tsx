"use client";

// Hub demo for @quartifex/contactsheet, shown on /contactsheet. A live contact sheet in
// the browser: the test scene loaded at every profile of a group, each in an iframe at
// the profile's real CSS size, then checked with the library's own collectSnapshot and
// evaluate. The CLI does the same in real browsers at each profile's true pixel ratio.
import { collectSnapshot, evaluate, type Flag } from "@quartifex/contactsheet/checks";
import {
  GROUPS,
  PROFILES,
  type Profile,
  type ProfileGroup,
} from "@quartifex/contactsheet/profiles";
import { useCallback, useEffect, useRef, useState } from "react";
import { Code, Controls, Note, Segmented } from "@/components/demo/kit";
import type { StagingMode } from "@/scene/scene";
import styles from "./contactsheet.module.css";
import shared from "./demos.module.css";

const GROUP_CHOICES = GROUPS.map((group) => ({ value: group, label: group.replace("-", " ") }));
const STAGING = [
  { value: "safeframe", label: "safeframe" },
  { value: "center", label: "Centred crop" },
] as const;
const TILE_HEIGHT = 220;
const TILE_MAX_WIDTH = 420;

type Result = { flags: Flag[] } | { error: string };

function Tile({
  profile,
  mode,
  onResult,
}: {
  profile: Profile;
  mode: StagingMode;
  onResult: (name: string, r: Result) => void;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const scale = Math.min(TILE_HEIGHT / profile.height, TILE_MAX_WIDTH / profile.width);

  const check = useCallback(
    (frame: HTMLIFrameElement) => {
      const win = frame.contentWindow;
      if (!win) return;
      let tries = 0;
      const poll = () => {
        if (!win.document.querySelector('[data-testid="scene"]') && tries++ < 40) {
          setTimeout(poll, 50);
          return;
        }
        try {
          const snapshot = collectSnapshot({}, win);
          // Iframes render at this screen's pixel ratio; judge canvases at the profile's.
          const flags = evaluate({ ...snapshot, dpr: profile.dpr });
          const next = { flags };
          setResult(next);
          onResult(profile.name, next);
        } catch (error) {
          const next = { error: error instanceof Error ? error.message : String(error) };
          setResult(next);
          onResult(profile.name, next);
        }
      };
      poll();
    },
    [profile, onResult],
  );

  // The iframe can finish loading before hydration attaches handlers, so check both the
  // current state and the load event.
  const frameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onLoad = () => check(frame);
    if (
      frame.contentDocument?.readyState === "complete" &&
      frame.contentWindow?.location.href !== "about:blank"
    ) {
      onLoad();
    }
    frame.addEventListener("load", onLoad);
    return () => frame.removeEventListener("load", onLoad);
  }, [check]);

  return (
    <figure
      className={styles.tile}
      style={{ width: Math.max(profile.width * scale, 180) }}
      data-testid="cs-tile"
      data-profile={profile.name}
    >
      <div
        className={styles.window}
        style={{ width: profile.width * scale, height: profile.height * scale }}
      >
        <iframe
          key={mode}
          title={`${profile.name}: test scene`}
          src={`/scene?mode=${mode}&dpr=${profile.dpr}`}
          width={profile.width}
          height={profile.height}
          style={{ transform: `scale(${scale})` }}
          className={styles.frame}
          inert
          ref={frameRef}
        />
      </div>
      <figcaption>
        <span className={styles.name}>{profile.name}</span>
        <span className={styles.meta}>
          {profile.width} x {profile.height} @{profile.dpr}
        </span>
        {result === null ? (
          <span className={styles.meta}>Checking</span>
        ) : "error" in result ? (
          <span className={shared.fail}>{result.error}</span>
        ) : result.flags.length === 0 ? (
          <span className={shared.pass} data-testid="cs-clear">
            No flags
          </span>
        ) : (
          <ul className={shared.list} data-testid="cs-flags">
            {result.flags.map((flag) => (
              <li
                key={`${flag.kind}-${flag.message}`}
                className={shared.fail}
                data-kind={flag.kind}
              >
                {flag.message}
              </li>
            ))}
          </ul>
        )}
      </figcaption>
    </figure>
  );
}

export default function Demo() {
  const [group, setGroup] = useState<ProfileGroup>("phone");
  const [mode, setMode] = useState<StagingMode>("center");
  const [results, setResults] = useState<Record<string, Result>>({});
  const profiles = PROFILES.filter((p) => p.group === group);
  const onResult = useCallback(
    (name: string, r: Result) => setResults((all) => ({ ...all, [name]: r })),
    [],
  );

  const done = profiles.filter((p) => results[p.name] !== undefined);
  const flagged = profiles.filter((p) => {
    const r = results[p.name];
    return r && "flags" in r && r.flags.length > 0;
  }).length;

  return (
    <div className={shared.demo} data-demo="contactsheet">
      <Controls label="Matrix">
        <Segmented
          legend="Profiles"
          value={group}
          choices={GROUP_CHOICES}
          onChange={(g) => {
            setResults({});
            setGroup(g);
          }}
        />
        <Segmented
          legend="Staging"
          value={mode}
          choices={STAGING}
          onChange={(m) => {
            setResults({});
            setMode(m);
          }}
        />
      </Controls>
      <p className={styles.summary} aria-live="polite" data-testid="cs-summary">
        {done.length < profiles.length
          ? `Checking ${profiles.length} profiles`
          : `${profiles.length} profiles, ${flagged} with flags`}
      </p>
      <div className={styles.sheet}>
        {profiles.map((profile) => (
          <Tile key={`${mode}-${profile.name}`} profile={profile} mode={mode} onResult={onResult} />
        ))}
      </div>
      <Note>
        {PROFILES.length} profiles in {GROUPS.length} groups: phones, landscape phones, foldables,
        tablets including split view, laptops, desktops up to 4K, 21:9 and 32:9 ultrawides, and
        in-app browsers. Flags: subject outside the frame, copy over the subject, overlapping text,
        tap targets under 24 x 24, canvases over their pixel budget, and layout shift. Nothing here
        animates.
      </Note>
      <Code>{`# Every profile, every chapter, one sheet: reports/contactsheet/contactsheet.html (+ .png, .json)
npx contactsheet https://lab.quartifex.com/scene --out reports/contactsheet

# A subset
npx contactsheet http://localhost:3100/scene --profiles phone,foldable,"Desktop 4K"`}</Code>
    </div>
  );
}
