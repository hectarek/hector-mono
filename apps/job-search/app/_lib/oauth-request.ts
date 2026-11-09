// The MCP endpoint's sign-in pages (docs/build-plan.md KTD22): Neon passes each the request Claude
// Code started, signed, in the address. The auth client sends it back with each step on its own.

// Whether the address carries Neon's signed request. Read in an effect: there's no window while
// Next prerenders.
export function hasOAuthRequest(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has("sig") && params.has("client_id");
}

// Neon answers a step with where the browser goes next (the consent page, or Claude Code's own
// callback), not with a redirect. Goes there, and says whether there was anywhere to go.
export function followNeon(data: unknown): boolean {
  if (
    data &&
    typeof data === "object" &&
    "url" in data &&
    typeof data.url === "string"
  ) {
    window.location.assign(data.url);
    return true;
  }
  return false;
}
