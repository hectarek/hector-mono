// Where a recipe's video plays in the page (docs/ux-plan.md D81): YouTube (without its tracking
// cookies until played) and Vimeo let their videos play inside another site. Other hosts, such
// as Instagram and TikTok, mostly don't, so their videos open on their own page (null here).
// Asked for after a tap, so the player starts playing.
export function videoEmbed(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  const id = (value: string | undefined | null) =>
    value && /^[\w-]{6,20}$/.test(value) ? value : null;

  let youtube: string | null = null;
  if (host === "youtu.be") {
    youtube = id(url.pathname.split("/")[1]);
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = url.pathname.split("/");
    youtube =
      first === "watch"
        ? id(url.searchParams.get("v"))
        : first === "shorts" || first === "embed" || first === "live"
          ? id(second)
          : null;
  }
  if (youtube) {
    return `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1`;
  }

  if (host === "vimeo.com") {
    const vimeo = url.pathname.split("/")[1];
    if (vimeo && /^\d+$/.test(vimeo)) {
      return `https://player.vimeo.com/video/${vimeo}?autoplay=1`;
    }
  }
  return null;
}
