/**
 * Robots.txt
 *
 * Generates robots.txt for SEO
 */

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/shared/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /ui stays crawlable on purpose: its noindex meta only works if crawlers can fetch it.
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
