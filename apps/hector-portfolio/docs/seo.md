# SEO Setup Guide

This guide explains how to use the SEO utilities. Lighthouse CI has its own guide: [lighthouse.md](./lighthouse.md).

## SEO Utilities

### Basic Usage

```typescript
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata = generateSEOMetadata({
  title: "My Page Title",
  description: "Page description for SEO",
  path: "/my-page",
  keywords: ["keyword1", "keyword2"],
  type: "website",
});
```

`path` is required and must start with `/`: it's the page's own path, and `generateSEOMetadata()` turns it into the page's canonical URL (`<link rel="canonical">`, via `alternates.canonical`) and its `og:url`, both `${SITE_URL}${path}`. The home page passes `"/"`.

### Advanced Usage

```typescript
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata = generateSEOMetadata({
  title: "My Page Title",
  description: "Page description",
  path: "/my-page", // Becomes the canonical URL and og:url
  keywords: ["keyword1", "keyword2"],
  image: "/og-image.png", // Will be converted to full URL
  type: "article",
  noIndex: false, // Set to true to prevent indexing
});
```

### Page-Level SEO

```typescript
// app/my-page/page.tsx
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata = generateSEOMetadata({
  title: "My Page",
  description: "Page-specific description",
  path: "/my-page",
  keywords: ["page", "specific", "keywords"],
});
```

Dynamic routes build the path in `generateMetadata()` from the item they render (`app/(main)/projects/[slug]/page.tsx` passes `` `/projects/${project.slug}` ``). Their not-found branch returns a plain title and description, with no canonical or `og:url`.

A client page (`"use client"`) can't export metadata: put it in a `layout.tsx` beside the page, as `app/ui/layout.tsx` does for `/ui`.

### Root layout

`app/layout.tsx` sets only a default title and description, with no canonical or `og:url`. Metadata merges shallowly down the route tree, so a URL in the root layout would be inherited by any route that doesn't set its own (404s, the error page) and would claim the home page's URL. Every page sets its own through `generateSEOMetadata()`.

### Pages kept out of search

`noIndex: true` adds `<meta name="robots" content="noindex, nofollow">`. Two pages use it, and neither is in the sitemap:

- `/reading`, the reading list
- `/ui`, the `@repo/ui` component gallery (metadata in `app/ui/layout.tsx`)

## Robots.txt

The `app/robots.ts` file automatically generates `robots.txt`:

- Allows all crawlers to access `/`
- Disallows `/api/` and `/_next/` directories
- Points to the sitemap at `${SITE_URL}/sitemap.xml`

Noindex pages (`/reading`, `/ui`) are deliberately not disallowed: a crawler has to fetch a page to see its noindex, and a URL blocked in robots.txt can still be indexed from links to it, without its content.

## Sitemap

The `app/sitemap.ts` file generates `sitemap.xml` from the indexable pages and every project page; noindex pages stay out. Add your routes:

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

1. **Always set metadata** - Use `generateSEOMetadata()` for all pages, with the page's own `path`
2. **Use descriptive titles** - Keep under 60 characters
3. **Write good descriptions** - 150-160 characters, compelling
4. **Add keywords** - Relevant keywords for your content
5. **Set images** - Open Graph images improve social sharing
6. **Update sitemap** - Add new routes to sitemap.ts
7. **Run Lighthouse** - Test before deploying

## Site URL

There's no environment variable for it. The canonical origin is set once, as `SITE_URL` in `src/shared/config/site.ts` (`https://www.hectorfgonzalez.com`). The apex `hectorfgonzalez.com` redirects to www, so every URL uses www.

This is used for:
- Canonical URLs, Open Graph URLs and relative image URLs in `generateSEOMetadata()`
- Sitemap URLs
- Robots.txt sitemap reference

