// Only same-app paths: "/join/abc" yes; "//evil.com", "/\evil.com" or "https://…" no.
// Resolved the way a browser would, so no spelling of another host slips through.
export function safeRedirect(value: string | string[] | undefined): string {
  const target = Array.isArray(value) ? value[0] : value;
  if (!target?.startsWith("/")) {
    return "/";
  }
  const base = "http://same.app";
  try {
    const url = new URL(target, base);
    return url.origin === base
      ? `${url.pathname}${url.search}${url.hash}`
      : "/";
  } catch {
    return "/";
  }
}
