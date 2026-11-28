import type { MetadataRoute } from "next";
import { PAGES } from "@/src/content/pages";
import { TOPICS } from "@/src/content/topics";
import { SITE_URL } from "@/src/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    ...TOPICS.map((t) => ({ url: `${SITE_URL}/${t.slug}` })),
    ...PAGES.map((p) => ({ url: `${SITE_URL}/${p.slug}` })),
  ];
}
