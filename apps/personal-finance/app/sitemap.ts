import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/` }];
}
