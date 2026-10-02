import { describe, expect, it } from "bun:test";
import { SITE_URL } from "@/src/shared/config/site";
import {
  DEFAULT_SHARE_IMAGE,
  generateSEOMetadata,
} from "@/src/shared/utils/seo";

describe("generateSEOMetadata", () => {
  it("sets the canonical and og:url to the page's own URL", () => {
    const metadata = generateSEOMetadata({
      title: "About",
      description: "About page",
      path: "/about",
    });

    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/about`);
    expect(metadata.openGraph?.url).toBe(`${SITE_URL}/about`);
  });

  it("uses the site root for the home page", () => {
    const metadata = generateSEOMetadata({
      title: "Home",
      description: "Home page",
      path: "/",
    });

    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/`);
    expect(metadata.openGraph?.url).toBe(`${SITE_URL}/`);
  });

  it("only adds a noindex robots rule when asked", () => {
    const indexed = generateSEOMetadata({
      title: "Now",
      description: "Now page",
      path: "/now",
    });
    const hidden = generateSEOMetadata({
      title: "UI",
      description: "Component gallery",
      path: "/ui",
      noIndex: true,
    });

    expect(indexed.robots).toBeUndefined();
    expect(hidden.robots).toEqual({ index: false, follow: false });
  });

  it("gives every page the default share card unless it passes its own", () => {
    const fallback = generateSEOMetadata({
      title: "About",
      description: "About page",
      path: "/about",
    });
    const custom = generateSEOMetadata({
      title: "Project",
      description: "Project page",
      path: "/projects/x",
      image: "/projects/x.webp",
    });

    expect(fallback.openGraph?.images).toEqual([
      { url: `${SITE_URL}${DEFAULT_SHARE_IMAGE}` },
    ]);
    expect(fallback.twitter?.images).toEqual([
      `${SITE_URL}${DEFAULT_SHARE_IMAGE}`,
    ]);
    expect(custom.openGraph?.images).toEqual([
      { url: `${SITE_URL}/projects/x.webp` },
    ]);
  });
});
