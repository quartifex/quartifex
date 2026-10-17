// The OG image: the lockup and the headline on the night palette, with the headlight glow,
// rendered at build time. (A still of the real 3D hero can replace it once captured on a GPU.)
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "AVENUE: every seat gets a first-class screen, and the screens work together.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = (
    await readFile(path.join(process.cwd(), "public", "brand", "avenue-lockup.svg"), "utf8")
  ).replaceAll('fill="currentColor"', 'fill="#eef1f6"');
  const src = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        color: "#eef1f6",
        background:
          "radial-gradient(70% 60% at 50% 115%, #9cc6ff 0%, #2d63ee 16%, #0b1f66 42%, #06070a 72%)",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: next/og renders plain img elements */}
      <img src={src} height={40} width={305} alt="" />
      <div style={{ display: "flex", flexDirection: "column", fontSize: 64, lineHeight: 1.02 }}>
        <span>Every seat gets a first-class screen.</span>
        <span style={{ color: "#8e97a8" }}>And the screens work together.</span>
      </div>
    </div>,
    size,
  );
}
