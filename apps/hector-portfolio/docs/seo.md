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
  image: "/projects/my-page.webp", // Optional: defaults to the share card, made a full URL
  type: "article",
  noIndex: false, // Set to true to prevent indexing
});
```

### Share image

Every page gets `public/og-image.png` (1200×630) as its `og:image` and `twitter:image` unless it passes its own `image` (`DEFAULT_SHARE_IMAGE` in `src/shared/utils/seo.ts`). It's set there rather than as an `app/opengraph-image` file because a page that sets its own `openGraph` replaces the inherited one, so a file-based image reached only the home page. The card is a static PNG, not an `ImageResponse` route: `next/og` needs inline styles, which the design lint bans. To change it, edit and re-render the card (any 1200×630 PNG works) and replace the file. The home-screen icon is `app/apple-icon.png` (180×180), which Next.js links on every page.

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
- Disallows `/api/`. `/_next/` stays crawlable: it serves the CSS and JS search engines need to render pages
- Points to the sitemap at `${SITE_URL}/sitemap.xml`

Noindex pages (`/reading`, `/ui`) are deliberately not disallowed: a crawler has to fetch a page to see its noindex, and a URL blocked in robots.txt can still be indexed from links to it, without its content.

## Sitemap

The `app/sitemap.ts` file generates `sitemap.xml` from the indexable pages and every project page; noindex pages stay out. It's prerendered like the pages, so it reads the date through a cached function (`getLastModified`): with Cache Components, a bare `new Date()` makes it render on every request. Add your routes:

```typescript
import { SITE_URL } from "@/src/shared/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = await getLastModified();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified,
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
5. **Set images** - every page has the default share card; pass `image` for a page-specific one
6. **Update sitemap** - Add new routes to sitemap.ts
7. **Run Lighthouse** - Test before deploying

## Site URL

There's no environment variable for it. The canonical origin is set once, as `SITE_URL` in `src/shared/config/site.ts` (`https://www.hectorfgonzalez.com`). The apex `hectorfgonzalez.com` redirects to www, so every URL uses www.

This is used for:
- Canonical URLs, Open Graph URLs and relative image URLs in `generateSEOMetadata()`
- Sitemap URLs
- Robots.txt sitemap reference

