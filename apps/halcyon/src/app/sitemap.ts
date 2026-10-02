import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://halcyon.quartifex.com", changeFrequency: "monthly", priority: 1 }];
}
