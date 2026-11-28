import type { Metadata } from "next";
import { PREVIEW_VERSION, SITE_NAME, SITE_URL } from "./site";

type PageMetadataInput = {
  title: string;
  description: string;
  path: `/${string}`;
};

// Each page's canonical link, og:url and its own preview. No title: the shell renders the only
// <title> (app/_components/page-title.tsx), so the route announcer reads the page that's showing.
// A page that sets openGraph replaces the inherited one, so every page passes its own image.
export function pageMetadata({
  title,
  description,
  path,
}: PageMetadataInput): Metadata {
  const url = `${SITE_URL}${path}`;
  const slug = path === "/" ? "home" : path.slice(1).replaceAll("/", "-");
  const image = {
    url: `${SITE_URL}/previews/${slug}-${PREVIEW_VERSION}.png`,
    width: 1200,
    height: 630,
    alt: title,
  };

  return {
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}
