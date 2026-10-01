# SEO Setup Guide

This guide explains how to use the SEO utilities and Lighthouse CI setup.

## SEO Utilities

### Basic Usage

```typescript
import { generateMetadata } from "@/src/shared/utils/seo";

export const metadata = generateMetadata({
  title: "My Page Title",
  description: "Page description for SEO",
  keywords: ["keyword1", "keyword2"],
  type: "website",
});
```

### Advanced Usage

```typescript
import { generateMetadata, generateCanonicalUrl } from "@/src/shared/utils/seo";

export const metadata = generateMetadata({
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
import { generateMetadata } from "@/src/shared/utils/seo";

export const metadata = generateMetadata({
  title: "My Page",
  description: "Page-specific description",
  keywords: ["page", "specific", "keywords"],
});
```

## Robots.txt

The `app/robots.ts` file automatically generates `robots.txt`:

- Allows all crawlers to access `/`
- Disallows `/api/` and `/_next/` directories
- Points to sitemap at `/sitemap.xml`

## Sitemap

The `app/sitemap.ts` file generates `sitemap.xml`. Add your routes:

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Add more routes...
  ];
}
```

## Lighthouse CI

### Running Lighthouse Tests

```bash
# Run Lighthouse CI (starts dev server automatically)
bun run lighthouse

# Or use explicit config
bun run lighthouse:ci
```

### Configuration

Lighthouse CI is configured in `.lighthouserc.js`:

- **Performance**: Minimum score 0.9 (90%)
- **Accessibility**: Minimum score 1.0 (100%)
- **Best Practices**: Minimum score 0.9 (90%)
- **SEO**: Minimum score 1.0 (100%)
- **PWA**: Minimum score 0.9 (90%)

### CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run Lighthouse CI
  run: bun run lighthouse:ci
```

### Customizing Scores

Edit `.lighthouserc.js` to adjust minimum scores:

```javascript
assertions: {
  "categories:performance": ["error", { minScore: 0.95 }], // 95% instead of 90%
  // ...
}
```

## Best Practices

1. **Always set metadata** - Use `generateMetadata()` for all pages
2. **Use descriptive titles** - Keep under 60 characters
3. **Write good descriptions** - 150-160 characters, compelling
4. **Add keywords** - Relevant keywords for your content
5. **Set images** - Open Graph images improve social sharing
6. **Update sitemap** - Add new routes to sitemap.ts
7. **Run Lighthouse** - Test before deploying

## Environment Variables

Set `NEXT_PUBLIC_APP_URL` in your `.env`:

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

This is used for:
- Canonical URLs
- Open Graph URLs
- Sitemap URLs
- Robots.txt sitemap reference

