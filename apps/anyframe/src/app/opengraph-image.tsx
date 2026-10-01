import { ImageResponse } from "next/og";

// The social card, rendered at build time: no committed raster.
export const alt = "anyframe: one scene, every screen. An open-source demo by Quartifex.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const frames = [
    { w: 90, h: 195 },
    { w: 150, h: 216 },
    { w: 280, h: 175 },
    { w: 420, h: 118 },
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
        background: "#050505",
        color: "#edeae4",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#8b8881" }}>
        QUARTIFEX · OPEN-SOURCE DEMO
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
        {frames.map((f) => (
          <div
            key={f.w}
            style={{
              width: f.w,
              height: f.h,
              border: "2px solid #3fbead",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#edeae4" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -2 }}>
          One scene, every screen.
        </div>
        <div style={{ fontSize: 26, color: "#8b8881" }}>anyframe.quartifex.com</div>
      </div>
    </div>,
    size,
  );
}
