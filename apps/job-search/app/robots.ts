import type { MetadataRoute } from "next";

// A private app: nothing to crawl. The root metadata's noindex covers any page found anyway.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
