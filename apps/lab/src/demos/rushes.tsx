"use client";

// Hub demo for @quartifex/rushes, shown on /rushes. The sequence on this page was made by
// rushes at build time from 72 synthetic frames; the demo reads its real manifest and
// report, shows any frame of any tier and format, and compares what a screen would
// download with and without the ladder.
import { decide, targetFromManifest } from "@quartifex/resolve";
import { type Format, framePath, type Tier } from "@quartifex/rushes/manifest";
import { useEffect, useState } from "react";
import { useDevice } from "@/components/demo/DeviceStage";
import { Code, Controls, Note, Readout, Segmented, Slider } from "@/components/demo/kit";
import { formatBytes, SEQUENCE_URL, useSequence } from "@/scene/sequence";
import shared from "./demos.module.css";
import styles from "./sequence.module.css";

const FORMATS = [
  { value: "avif", label: "AVIF" },
  { value: "webp", label: "WebP" },
] as const;

export default function Demo() {
  const data = useSequence();
  const { device, controls } = useDevice("tall-phone", 3);
  const [tierName, setTierName] = useState("w960");
  const [format, setFormat] = useState<Format>("avif");
  const [index, setIndex] = useState(0);
  const [bytes, setBytes] = useState<number | null>(null);

  const manifest = data?.manifest;
  const tier = manifest?.tiers.find((t) => t.name === tierName) ?? manifest?.tiers[0];
  const src = manifest && tier ? SEQUENCE_URL + framePath(manifest, tier, format, index) : null;

  useEffect(() => {
    if (!src) return;
    let live = true;
    fetch(src)
      .then((r) => r.blob())
      .then((b) => {
        if (live) setBytes(b.size);
      });
    return () => {
      live = false;
    };
  }, [src]);

  // Everything renders from the first paint with "–" placeholders (the manifest is fetched),
  // so nothing below moves when it arrives.
  const largest = manifest?.tiers[manifest.tiers.length - 1] as Tier | undefined;
  const decision = manifest
    ? decide(
        { width: device.width, height: device.height, dpr: device.dpr, gpuTier: 2 },
        targetFromManifest(manifest, { fit: "contain" }),
      )
    : null;
  const picked = decision ? (manifest?.tiers[decision.tier.index] as Tier) : undefined;
  const naive = largest?.bytes.webp ?? 0;
  const laddered = picked ? (picked.bytes.avif ?? picked.bytes.webp ?? 0) : 0;
  const tiers = manifest?.tiers.map((t) => ({ value: t.name, label: `${t.width} px` })) ?? [
    { value: "w480", label: "480 px" },
    { value: "w960", label: "960 px" },
    { value: "w1600", label: "1600 px" },
  ];
  const DASH = "–";

  return (
    <div className={shared.demo} data-demo="rushes">
      <Readout
        label="Sequence"
        rows={[
          [
            "Source frames",
            manifest ? `${manifest.frames} at ${manifest.fps} fps` : DASH,
            "rs-frames",
          ],
          ["Source size", manifest ? `${manifest.source.width} x ${manifest.source.height}` : DASH],
          ["Tiers", manifest ? manifest.tiers.map((t) => t.width).join(" / ") : DASH, "rs-tiers"],
          ["Formats", manifest ? manifest.formats.join(", ") : DASH],
          [
            "Budget",
            data ? (data.report.pass ? "Within budget" : "Over budget") : DASH,
            "rs-budget",
          ],
        ]}
      />

      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="rs-table">
          <caption>Page weight per tier, from report.json</caption>
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Frames</th>
              <th scope="col">Format</th>
              <th scope="col">Total</th>
              <th scope="col">Per frame</th>
              <th scope="col">First screen</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {!data &&
              ["a", "b", "c", "d", "e", "f"].map((k) => (
                <tr key={k}>
                  <th scope="row">{DASH}</th>
                  {[1, 2, 3, 4, 5, 6].map((c) => (
                    <td key={c}>{DASH}</td>
                  ))}
                </tr>
              ))}
            {data?.report.lines.map((line) => (
              <tr key={`${line.tier}-${line.format}`}>
                <th scope="row">{line.tier}</th>
                <td>{line.frames}</td>
                <td>{line.format}</td>
                <td>{formatBytes(line.bytes)}</td>
                <td>{formatBytes(line.averageFrame)}</td>
                <td>{formatBytes(line.initialBytes)}</td>
                <td className={line.pass ? shared.pass : shared.fail}>
                  {line.pass ? "Pass" : "Over"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={shared.panel}>
        <h3 className={shared.panelTitle}>Any frame, any tier</h3>
        <Controls label="Frame">
          <Segmented
            legend="Tier"
            value={tier?.name ?? tierName}
            choices={tiers}
            onChange={setTierName}
          />
          <Segmented legend="Format" value={format} choices={FORMATS} onChange={setFormat} />
          <Slider
            label="Frame"
            value={index}
            min={0}
            max={(tier?.frames ?? 72) - 1}
            step={1}
            onChange={setIndex}
            format={(v) => `${v + 1} / ${tier?.frames ?? DASH}`}
          />
        </Controls>
        <div className={styles.viewer}>
          {!(src && tier) && <div className={styles.frame} style={{ aspectRatio: "16 / 9" }} />}
          {src && tier && (
            // biome-ignore lint/performance/noImgElement: shows the exact encoded file, not an optimised copy
            <img
              src={src}
              width={tier.width}
              height={tier.height}
              alt={`Frame ${index + 1} of the ${tier.name} tier, ${format}`}
              className={styles.frame}
              data-testid="rs-frame"
            />
          )}
          <Readout
            label="This file"
            rows={[
              ["File", src?.replace(SEQUENCE_URL, "") ?? ""],
              ["Size", bytes === null ? "" : formatBytes(bytes), "rs-bytes"],
              ["Pixels", tier ? `${tier.width} x ${tier.height}` : DASH],
              [
                "Frame step",
                !tier
                  ? DASH
                  : tier.step === 1
                    ? "every source frame"
                    : `1 in ${tier.step} source frames`,
              ],
            ]}
          />
        </div>
      </div>

      <div className={shared.panel}>
        <h3 className={shared.panelTitle}>What one screen downloads</h3>
        <Controls label="Screen">{controls}</Controls>
        <Readout
          label="Download"
          rows={[
            ["Without a ladder", largest ? `${largest.name} WebP: ${formatBytes(naive)}` : DASH],
            [
              "With rushes + resolve",
              picked
                ? `${picked.name} ${picked.bytes.avif ? "AVIF" : "WebP"}: ${formatBytes(laddered)}`
                : DASH,
              "rs-laddered",
            ],
            [
              "Saved",
              naive ? `${Math.max(0, Math.round((1 - laddered / naive) * 100))}%` : DASH,
              "rs-saved",
            ],
            ["Why", decision ? decision.reasons.tier.join("; ") : DASH],
          ]}
        />
      </div>

      <Code>{`# One command: frames (or a video, with ffmpeg) to tiers, posters, manifest and report
npx rushes renders/jar --out public/sequences/jar --widths 480,960,1600 --budget budget.json --strict`}</Code>
      <Note>
        Nothing on this page moves on its own; every change follows a control. The frames are
        synthetic and drawn in code, so no client footage is involved.
      </Note>
    </div>
  );
}
