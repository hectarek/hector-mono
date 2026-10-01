# SEO Setup Guide

This guide explains how to use the SEO utilities. Lighthouse CI has its own guide: [lighthouse.md](./lighthouse.md).

## SEO Utilities

### Basic Usage

```typescript
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata = generateSEOMetadata({
  title: "My Page Title",
  description: "Page description for SEO",
  keywords: ["keyword1", "keyword2"],
  type: "website",
});
```

### Advanced Usage

```typescript
import { generateCanonicalUrl, generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata = generateSEOMetadata({
  title: "My Page Title",
  description: "Page description",
  keywords: ["keyword1", "keyword2"],
  image: "/og-image.png", // Will be converted to full URL
  url: "/my-page", // Will be converted to full URL
  type: "article",
  noIndex: false, // Set to true to prevent indexing
});

// Generate canonical URL
const canonical = generateCanonicalUrl("/my-page");
```

### Page-Level SEO

```typescript
// app/my-page/page.tsx
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata = generateSEOMetadata({
  title: "My Page",
  description: "Page-specific description",
  keywords: ["page", "specific", "keywords"],
});
```

## Robots.txt

The `app/robots.ts` file automatically generates `robots.txt`:

- Allows all crawlers to access `/`
- Disallows `/api/` and `/_next/` directories
- Points to the sitemap at `${SITE_URL}/sitemap.xml`

## Sitemap

The `app/sitemap.ts` file generates `sitemap.xml`. Add your routes:

```typescript
import { SITE_URL } from "@/src/shared/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Add more routes...
  ];
}
```

## Lighthouse CI

How to run it, and the score thresholds `.lighthouserc.js` asserts, are in [lighthouse.md](./lighthouse.md).

## Best Practices

1. **Always set metadata** - Use `generateSEOMetadata()` for all pages
2. **Use descriptive titles** - Keep under 60 characters
3. **Write good descriptions** - 150-160 characters, compelling
4. **Add keywords** - Relevant keywords for your content
5. **Set images** - Open Graph images improve social sharing
6. **Update sitemap** - Add new routes to sitemap.ts
7. **Run Lighthouse** - Test before deploying

## Site URL

There's no environment variable for it. The canonical origin is set once, as `SITE_URL` in `src/shared/config/site.ts` (`https://www.hectorfgonzalez.com`). The apex `hectorfgonzalez.com` redirects to www, so every URL uses www.

This is used for:
- Open Graph URLs (and relative image URLs) in `generateSEOMetadata()`
- `generateCanonicalUrl()` when no base URL is passed
- Sitemap URLs
- Robots.txt sitemap reference

