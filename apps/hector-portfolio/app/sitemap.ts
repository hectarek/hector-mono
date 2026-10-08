/**
 * Sitemap
 *
 * Generates sitemap.xml for SEO
 */

import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { getAllProjectSlugs } from "@/src/lib/data";
import { SITE_URL } from "@/src/shared/config/site";

// Every entry's lastModified. Reading the clock is only allowed inside a cache, so the sitemap
// is prerendered with the pages; `max` refreshes it within 30 days.
async function getLastModified(): Promise<Date> {
  "use cache";
  cacheLife("max");
  return new Date();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projectSlugs = getAllProjectSlugs();
  const lastModified = await getLastModified();

  const routes = [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/now`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    },
  ];

  const projectRoutes = projectSlugs.map((slug) => ({
    url: `${SITE_URL}/projects/${slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...routes, ...projectRoutes];
}
