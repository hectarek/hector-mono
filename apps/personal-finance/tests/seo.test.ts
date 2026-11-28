import { describe, expect, it } from "bun:test";
import { pageMetadata } from "@/src/seo";
import { PREVIEW_VERSION, SITE_URL } from "@/src/site";

const mortgage = pageMetadata({
  title: "What a home really costs each month",
  description: "The payment, plus the costs people miss.",
  path: "/mortgage",
});

describe("pageMetadata", () => {
  it("makes the page's own address its canonical link and og:url", () => {
    expect(mortgage.alternates?.canonical).toBe(`${SITE_URL}/mortgage`);
    expect(mortgage.openGraph?.url).toBe(`${SITE_URL}/mortgage`);
  });

  it("names the page's own preview image, versioned, at 1200 by 630", () => {
    expect(mortgage.openGraph?.images).toEqual([
      {
        url: `${SITE_URL}/previews/mortgage-${PREVIEW_VERSION}.png`,
        width: 1200,
        height: 630,
        alt: "What a home really costs each month",
      },
    ]);
  });

  it("gives the home page the site's root address and the home preview", () => {
    const home = pageMetadata({
      title: "Home",
      description: "Start",
      path: "/",
    });
    expect(home.alternates?.canonical).toBe(`${SITE_URL}/`);
    expect(home.openGraph?.images).toEqual([
      expect.objectContaining({
        url: `${SITE_URL}/previews/home-${PREVIEW_VERSION}.png`,
      }),
    ]);
  });

  it("sets no page title, since the shell renders the only <title>", () => {
    expect(mortgage.title).toBeUndefined();
    expect(mortgage.openGraph?.title).toBe(
      "What a home really costs each month",
    );
  });
});
