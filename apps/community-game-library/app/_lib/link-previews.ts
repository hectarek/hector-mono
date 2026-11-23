import type { Metadata } from "next";

// The link previews a chat app shows (Y2; R39, R36): the app's own address, a friend's link and a
// game night's link. Each is the same for every link of its kind, so a preview never names a
// member, a game night, a place, an address or a phone: anyone in the chat can see it.
export const LINK_PREVIEWS = {
  app: {
    title: "Community Game Library",
    line: "Your friends’ board games, in one place.",
  },
  friend: {
    title: "A friend sent you their link",
    line: "A friend sent you their link",
  },
  night: {
    title: "You’re invited to a game night",
    line: "You’re invited to a game night",
  },
} as const;

type LinkPreview = keyof typeof LINK_PREVIEWS;

// Its image, public/previews/<kind>.png: Y2's preview at twice its size, the name stacked in
// navy Stardos Stencil (124 px) on kraft and the line in IBM Plex Sans (48 px), sized as chat
// apps draw a large preview. Made once with next/og and kept as files (the design rules allow
// no inline styles, which next/og draws with), so a change to Y2 makes them again.
const PREVIEW_SIZE = { width: 1200, height: 630 };

// A page's preview, for its metadata: the title, Y2's line, and the image.
export function previewMetadata(kind: LinkPreview): Metadata {
  const { title, line } = LINK_PREVIEWS[kind];
  const image = { url: `/previews/${kind}.png`, ...PREVIEW_SIZE, alt: title };
  return {
    openGraph: {
      title,
      description: line,
      siteName: LINK_PREVIEWS.app.title,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: line,
      images: [image],
    },
  };
}
