"use client";

// Hub demo for @quartifex/resolve, shown on /resolve. Pick a screen, a pixel ratio, a GPU
// tier and a connection; resolve picks the sequence tier, canvas pixel ratio, texture and
// shadow-map size from the real rushes manifest, and says why. The chosen frame is shown.
import {
  decide,
  type EffectiveType,
  explain,
  type GpuTier,
  targetFromManifest,
} from "@quartifex/resolve";
import { getGpuTier } from "@quartifex/resolve/gpu";
import { useResolve } from "@quartifex/resolve/react";
import { framePath, type Tier } from "@quartifex/rushes/manifest";
import { useMemo, useState } from "react";
import { Screen, useDevice } from "@/components/demo/DeviceStage";
import { Button, Code, Controls, Note, Readout, Segmented, Toggle } from "@/components/demo/kit";
import { formatBytes, SEQUENCE_URL, useSequence } from "@/scene/sequence";
import shared from "./demos.module.css";
import styles from "./sequence.module.css";

const GPU = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
] as const;
const NETWORK = [
  { value: "4g", label: "4G" },
  { value: "3g", label: "3G" },
  { value: "2g", label: "2G" },
  { value: "slow-2g", label: "Slow 2G" },
] as const;
const FIT = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
] as const;

export default function Demo() {
  const data = useSequence();
  const { device, controls } = useDevice("tall-phone", 3);
  const [gpu, setGpu] = useState<"0" | "1" | "2" | "3">("2");
  const [network, setNetwork] = useState<EffectiveType>("4g");
  const [saveData, setSaveData] = useState(false);
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [detected, setDetected] = useState<string | null>(null);

  const manifest = data?.manifest;
  const target = useMemo(
    () => (manifest ? targetFromManifest(manifest, { fit }) : null),
    [manifest, fit],
  );
  if (!manifest || !target) return <Note>Loading the sequence manifest.</Note>;

  const decision = decide(
    {
      width: device.width,
      height: device.height,
      dpr: device.dpr,
      gpuTier: Number(gpu) as GpuTier,
      effectiveType: network,
      saveData,
    },
    target,
  );
  const tier = manifest.tiers[decision.tier.index] as Tier;
  const largest = manifest.tiers[manifest.tiers.length - 1] as Tier;

  const detect = async () => {
    setDetected("Detecting");
    const tierFound = await getGpuTier();
    if (tierFound === undefined) setDetected("Unknown on this device");
    else {
      setDetected(`Tier ${tierFound}`);
      setGpu(String(tierFound) as "0" | "1" | "2" | "3");
    }
  };

  return (
    <div className={shared.demo} data-demo="resolve">
      <Controls label="Environment">
        {controls}
        <Segmented legend="GPU tier" value={gpu} choices={GPU} onChange={setGpu} />
        <Segmented legend="Connection" value={network} choices={NETWORK} onChange={setNetwork} />
        <Toggle label="Save-Data" checked={saveData} onChange={setSaveData} />
        <Segmented legend="Fit" value={fit} choices={FIT} onChange={setFit} />
      </Controls>

      <div className={shared.split}>
        <Screen
          device={device}
          label={`The ${tier.name} frame at ${device.width} x ${device.height}`}
        >
          <div className={styles.stage}>
            {/* biome-ignore lint/performance/noImgElement: shows the exact tier file resolve picked */}
            <img
              src={SEQUENCE_URL + framePath(manifest, tier, "webp", Math.floor(tier.frames / 6))}
              alt=""
              style={{ objectFit: fit }}
              data-testid="rv-frame"
            />
          </div>
        </Screen>
        <div className={shared.side}>
          <Readout
            label="Decision"
            rows={[
              ["Sequence tier", `${tier.name} (${tier.width} px)`, "rv-tier"],
              ["Canvas pixel ratio", decision.dpr, "rv-dpr"],
              ["Device px needed", decision.needed, "rv-needed"],
              ["Texture", decision.texture, "rv-texture"],
              ["Shadow map", decision.shadowMap || "off", "rv-shadow"],
              ["Tier weight (AVIF)", formatBytes(tier.bytes.avif ?? 0)],
              ["Largest tier (AVIF)", formatBytes(largest.bytes.avif ?? 0)],
            ]}
          />
          <div className={styles.reasons}>
            <h3 className={shared.panelTitle}>Why</h3>
            <pre data-testid="rv-explain">{explain(decision)}</pre>
          </div>
          <Controls label="This device">
            <Button onClick={detect}>Detect this GPU</Button>
            {detected && <span data-testid="rv-detected">{detected}</span>}
          </Controls>
          <Note>
            GPU detection uses detect-gpu, which compares your GPU with public benchmark data and
            may fetch that data from a CDN; it runs only when you press the button.
          </Note>
        </div>
      </div>

      <ThisBrowser target={target} />
      <Code>{`import { decide, explain, readEnvironment, targetFromManifest } from "@quartifex/resolve";

const decision = decide(readEnvironment(gpuTier), targetFromManifest(manifest, { fit: "cover" }));
console.log(explain(decision));`}</Code>
      <Note>Every value here follows a control; nothing animates.</Note>
    </div>
  );
}

function ThisBrowser({ target }: { target: NonNullable<Parameters<typeof useResolve>[0]> }) {
  const decision = useResolve(target);
  if (!decision) return null;
  return (
    <Readout
      label="This browser window"
      rows={[
        ["Your tier", decision.tier.name, "rv-own-tier"],
        ["Your pixel ratio", decision.dpr],
        ["Why", decision.reasons.tier.join("; ")],
      ]}
    />
  );
}
