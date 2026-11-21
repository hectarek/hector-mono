// Sharing a link or a ready message (KTD18, R52): the phone's share sheet where the browser has
// one, and otherwise the clipboard. A share the person closes without sending is no failure.
export async function shareOrCopy({
  text,
  url,
}: {
  text: string;
  url?: string;
}): Promise<"shared" | "copied" | "closed" | "failed"> {
  const data = url ? { text, url } : { text };
  if (
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare(data))
  ) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "closed";
      // Refused (no tap to share from, or not allowed here): copy it instead.
    }
  }
  try {
    await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
    return "copied";
  } catch {
    return "failed";
  }
}
