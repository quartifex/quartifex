import { ImageResponse } from "next/og";

// The social card, rendered at build time: no committed raster.
export const alt =
  "halcyon: one launch story in full, reduced and static motion. An open-source demo by Quartifex.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const levels = [
    { label: "FULL", fill: "#e9a457" },
    { label: "REDUCED", fill: "#c99a6e" },
    { label: "STATIC", fill: "#8b8881" },
  ];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "#0d0b0a",
        color: "#edeae4",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#8b8881" }}>
        QUARTIFEX · OPEN-SOURCE DEMO
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        {levels.map((l) => (
          <div
            key={l.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 22px",
              border: "2px solid #3a3330",
              borderRadius: 40,
              fontSize: 22,
              letterSpacing: 3,
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 7, background: l.fill }} />
            {l.label}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2 }}>
          Cinematic, and accessible.
        </div>
        <div style={{ fontSize: 26, color: "#8b8881" }}>halcyon.quartifex.com</div>
      </div>
    </div>,
    size,
  );
}
