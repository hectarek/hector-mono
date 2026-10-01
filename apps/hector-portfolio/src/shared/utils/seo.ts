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
  keywords?: string[];
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
}

/**
 * Generate metadata object for Next.js
 */
export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords,
    image,
    url,
    type = "website",
    noIndex = false,
  } = config;

  const fullImageUrl = image
    ? image.startsWith("http")
      ? image
      : `${SITE_URL}${image}`
    : undefined;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  const metadata: Metadata = {
    title,
    description,
    keywords: keywords?.join(", "),
    openGraph: {
      title,
      description,
      type,
      ...(fullImageUrl && { images: [{ url: fullImageUrl }] }),
      url: fullUrl,
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

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(path: string, baseUrl?: string): string {
  const base = baseUrl || SITE_URL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Alias for generateMetadata for backward compatibility
 */
export const generateSEOMetadata = generateMetadata;
