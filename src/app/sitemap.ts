import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://asuntosijoituslaskuri.fi/",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://asuntosijoituslaskuri.fi/tietosuoja",
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
