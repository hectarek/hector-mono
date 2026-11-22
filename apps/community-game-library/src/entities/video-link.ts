// Where a game's how-to-play video plays in its page (R7), copied from recipes' video-link.ts:
// YouTube (without its tracking cookies until played) and Vimeo let their videos play inside
// another site. Other hosts mostly don't, so their videos open on their own page (null here).
// Asked for after a tap, so the player starts playing.
export function videoEmbed(link: string): string | null {
  const url = parseLink(link);
  if (!url) {
    return null;
  }
  const youtube = youtubeId(url);
  if (youtube) {
    return `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1`;
  }

  if (hostOf(url) === "vimeo.com") {
    const vimeo = url.pathname.split("/")[1];
    if (vimeo && /^\d+$/.test(vimeo)) {
      return `https://player.vimeo.com/video/${vimeo}?autoplay=1`;
    }
  }
  return null;
}

function parseLink(link: string): URL | null {
  try {
    return new URL(link);
  } catch {
    return null;
  }
}

function hostOf(url: URL): string {
  return url.hostname.replace(/^(www|m)\./, "");
}

// A YouTube link's video id: watch, youtu.be, Shorts, embed and live links.
function youtubeId(url: URL): string | null {
  const host = hostOf(url);
  const id = (value: string | undefined | null) =>
    value && /^[\w-]{6,20}$/.test(value) ? value : null;

  if (host === "youtu.be") {
    return id(url.pathname.split("/")[1]);
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = url.pathname.split("/");
    return first === "watch"
      ? id(url.searchParams.get("v"))
      : first === "shorts" || first === "embed" || first === "live"
        ? id(second)
        : null;
  }
  return null;
}
