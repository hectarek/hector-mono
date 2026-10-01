/**
 * SEO Utilities
 *
 * Helper functions for generating SEO metadata
 */

import type { Metadata } from "next";

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

  const baseUrl = process.env["NEXT_PUBLIC_SITE_URL"] || "https://example.com";
  const fullImageUrl = image
    ? image.startsWith("http")
      ? image
      : `${baseUrl}${image}`
    : undefined;
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;

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
  const base =
    baseUrl || process.env["NEXT_PUBLIC_SITE_URL"] || "https://example.com";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Alias for generateMetadata for backward compatibility
 */
export const generateSEOMetadata = generateMetadata;
