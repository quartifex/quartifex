import { ImageResponse } from "next/og";

// The social card, rendered at build time: no committed raster.
export const alt =
  "reelhouse: docs and a live playground for reel and rushes. An open-source demo by Quartifex.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const tiers = [
    { label: "w480", w: 96 },
    { label: "w960", w: 192 },
    { label: "w1600", w: 320 },
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
        background: "#0d0c0b",
        color: "#edeae4",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#8b8881" }}>
        QUARTIFEX · OPEN-SOURCE DEMO
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>
        {tiers.map((t) => (
          <div key={t.label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                width: t.w,
                height: t.w * 0.625,
                border: "2px solid #e9a457",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: t.w * 0.3,
                  height: t.w * 0.3,
                  borderRadius: t.w,
                  background: "#ffe7bf",
                }}
              />
            </div>
            <div style={{ display: "flex", fontSize: 18, color: "#8b8881" }}>{t.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2 }}>
          Footage in. A sequence out, weighed.
        </div>
        <div style={{ fontSize: 26, color: "#8b8881" }}>reelhouse.quartifex.com</div>
      </div>
    </div>,
    size,
  );
}
