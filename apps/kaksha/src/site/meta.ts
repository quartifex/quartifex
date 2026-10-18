import type { Metadata, Viewport } from "next";
import { PRODUCT_NAME, PRODUCT_NAME_HI, SITE_URL } from "../config";

export function siteMetadata(lang: "en" | "hi"): Metadata {
  const title =
    lang === "hi"
      ? `${PRODUCT_NAME_HI}: पूरी कक्षा की जाँच, बिना इंटरनेट के`
      : `${PRODUCT_NAME}: mark a whole class, offline`;
  const description =
    lang === "hi"
      ? "शिक्षकों के लिए मुफ़्त ऐप: टेस्ट और रूब्रिक से जाँच, कक्षा और विद्यार्थी की प्रगति। बिना इंटरनेट के चलता है; डेटा फ़ोन पर ही रहता है।"
      : "A free app for teachers to mark tests and rubrics and see class progress. Works offline. Student data stays on the phone. Hindi and English.";
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: lang === "hi" ? "/hi" : "/", languages: { en: "/", hi: "/hi" } },
    icons: { icon: "/brand/mark.svg", apple: "/brand/apple-touch-icon.png" },
    openGraph: {
      title,
      description,
      url: lang === "hi" ? "/hi" : "/",
      siteName: PRODUCT_NAME,
      locale: lang === "hi" ? "hi_IN" : "en_IN",
      type: "website",
    },
  };
}

export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b2340",
};
