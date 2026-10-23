import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.asuntosijoituslaskuri.fi/",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://www.asuntosijoituslaskuri.fi/tietosuoja",
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
