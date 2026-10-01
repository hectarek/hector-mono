// The page a pasted recipe came from: the link typed before it, when that's a web page's
// address (P14.11). A link the importer refused ("toast", localhost, an address written as
// numbers) isn't kept as the recipe's source.
export function pastedFrom(link: string): string | undefined {
  const typed = link.trim();
  if (!typed) return undefined;
  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(typed) ? typed : `https://${typed}`,
    );
    // "toast." is "toast": a trailing dot names no more of a site.
    const host = url.hostname.replace(/\.$/, "");
    const named =
      host.includes(".") && !/^[\d.]+$/.test(host) && !host.startsWith("[");
    return (url.protocol === "https:" || url.protocol === "http:") && named
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
