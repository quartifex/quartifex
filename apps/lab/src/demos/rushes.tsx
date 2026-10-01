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

  if (!manifest || !data || !tier) return <Note>Loading the sequence manifest.</Note>;

  const largest = manifest.tiers[manifest.tiers.length - 1] as Tier;
  const decision = decide(
    { width: device.width, height: device.height, dpr: device.dpr, gpuTier: 2 },
    targetFromManifest(manifest, { fit: "contain" }),
  );
  const picked = manifest.tiers[decision.tier.index] as Tier;
  const naive = largest.bytes.webp ?? 0;
  const laddered = picked.bytes.avif ?? picked.bytes.webp ?? 0;
  const tiers = manifest.tiers.map((t) => ({ value: t.name, label: `${t.width} px` }));

  return (
    <div className={shared.demo} data-demo="rushes">
      <Readout
        label="Sequence"
        rows={[
          ["Source frames", `${manifest.frames} at ${manifest.fps} fps`, "rs-frames"],
          ["Source size", `${manifest.source.width} x ${manifest.source.height}`],
          ["Tiers", manifest.tiers.map((t) => t.width).join(" / "), "rs-tiers"],
          ["Formats", manifest.formats.join(", ")],
          ["Budget", data.report.pass ? "Within budget" : "Over budget", "rs-budget"],
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
            {data.report.lines.map((line) => (
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
          <Segmented legend="Tier" value={tier.name} choices={tiers} onChange={setTierName} />
          <Segmented legend="Format" value={format} choices={FORMATS} onChange={setFormat} />
          <Slider
            label="Frame"
            value={index}
            min={0}
            max={tier.frames - 1}
            step={1}
            onChange={setIndex}
            format={(v) => `${v + 1} / ${tier.frames}`}
          />
        </Controls>
        <div className={styles.viewer}>
          {src && (
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
              ["Pixels", `${tier.width} x ${tier.height}`],
              [
                "Frame step",
                tier.step === 1 ? "every source frame" : `1 in ${tier.step} source frames`,
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
            ["Without a ladder", `${largest.name} WebP: ${formatBytes(naive)}`],
            [
              "With rushes + resolve",
              `${picked.name} ${picked.bytes.avif ? "AVIF" : "WebP"}: ${formatBytes(laddered)}`,
              "rs-laddered",
            ],
            ["Saved", `${Math.max(0, Math.round((1 - laddered / naive) * 100))}%`, "rs-saved"],
            ["Why", decision.reasons.tier.join("; ")],
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
