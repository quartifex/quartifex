import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Lumorphism",
  description: "A design language of glowing gel: every control and headline poured from light.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

// The piece is one self-contained page (its own WebGL surface and controls), shown full screen.
export default function Page() {
  return (
    <iframe
      src="/lumorphism/index.html"
      title="Lumorphism, a design language of glowing gel"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0 }}
    />
  );
}
