/**
 * SEO Utilities
 *
 * Helper functions for generating SEO metadata
 */

import type { Metadata } from "next";
import { SITE_URL } from "@/src/shared/config/site";

export interface SEOConfig {
  title: string;
  description: string;
  /** The page's own path, e.g. "/about": its canonical URL and og:url. */
  path: `/${string}`;
  keywords?: string[];
  image?: string;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
}

/**
 * Generate a page's metadata object for Next.js
 */
export function generateSEOMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    path,
    keywords,
    image,
    type = "website",
    noIndex = false,
  } = config;

  const fullImageUrl = image
    ? image.startsWith("http")
      ? image
      : `${SITE_URL}${image}`
    : undefined;
  const pageUrl = `${SITE_URL}${path}`;

  const metadata: Metadata = {
    title,
    description,
    keywords: keywords?.join(", "),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      type,
      ...(fullImageUrl && { images: [{ url: fullImageUrl }] }),
      url: pageUrl,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(fullImageUrl && { images: [fullImageUrl] }),
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };

  return metadata;
}
