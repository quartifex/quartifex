// The OG image: a still of the hero (the car at night, drawn from its own geometry) with the
// placeholder wordmark, rendered at build time.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { posterSvg } from "@/stage/poster";

export const alt = "AVENUE: the concept car at night, in profile, under a high light.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const poster = posterSvg({ width: 1200, height: 630, id: "og" });
  const logo = (
    await readFile(path.join(process.cwd(), "public", "brand", "avenue-logo.svg"), "utf8")
  ).replace('fill="currentColor"', 'fill="#edebe7"');
  const src = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#030304",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: next/og renders plain img elements */}
      <img
        src={src(poster)}
        width={1200}
        height={630}
        alt=""
        style={{ position: "absolute", inset: 0 }}
      />
      {/* biome-ignore lint/performance/noImgElement: next/og renders plain img elements */}
      <img
        src={src(logo)}
        width={440}
        height={49}
        alt=""
        style={{ position: "absolute", left: 72, top: 72 }}
      />
    </div>,
    size,
  );
}
