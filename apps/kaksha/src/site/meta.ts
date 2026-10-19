import type { Metadata, Viewport } from "next";
import { PRODUCT_NAME, SITE_URL } from "../config";

export function siteMetadata(): Metadata {
  const title = `${PRODUCT_NAME}: mark a whole class, offline`;
  const description =
    "A free app for teachers and educators to mark tests and rubrics and see class progress. Works offline. Student data stays on the phone. Hindi and English.";
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: "/" },
    icons: { icon: "/brand/mark.svg", apple: "/brand/apple-touch-icon.png" },
    openGraph: {
      title,
      description,
      url: "/",
      siteName: PRODUCT_NAME,
      locale: "en_IN",
      type: "website",
    },
  };
}

export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f2f8",
};
