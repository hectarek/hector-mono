import { HydrationScript } from "@solidjs/web";
import type { ParentProps } from "solid-js";

const FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;600;700&family=Stardos+Stencil:wght@700&display=swap";

// The document shell, the index.html replacement: the full <html>, with no client JS.
export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#d9bc8c" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin=""
        />
        <link rel="stylesheet" href={FONTS} />
        <title>Game Library</title>
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
