import type { MetadataRoute } from "next";

const SITE_URL = "https://midsesh.com";

/* Only routes that exist today. The expert funnel (/experts, /experts/apply)
   lands in a later week; add those entries when the pages ship. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
