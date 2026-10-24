import { afterEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import proxy, { config } from "@/proxy";

const SESSION_COOKIE = "__Secure-neon-auth.session_token";
const SESSION_DATA_COOKIE = "__Secure-neon-auth.local.session_data";

// Signed in, with the 5-minute cached copy of the session still present.
const request = (path: string, signedIn = false) =>
  new NextRequest(`https://app.example${path}`, {
    headers: signedIn
      ? { cookie: `${SESSION_COOKIE}=abc; ${SESSION_DATA_COOKIE}=cached` }
      : {},
  });

// Signed in, but the cached copy has expired (the browser dropped it).
const staleRequest = (path: string) =>
  new NextRequest(`https://app.example${path}`, {
    headers: { cookie: `${SESSION_COOKIE}=abc` },
  });

// A server action call: a POST to the page's own path, named by the Next-Action header.
const actionRequest = (path: string, cookie?: string) =>
  new NextRequest(`https://app.example${path}`, {
    method: "POST",
    headers: cookie
      ? { "next-action": "action-id", cookie }
      : { "next-action": "action-id" },
  });

// NextResponse.next(): the request goes on to the page or action.
const passedThrough = (response: Response) =>
  response.headers.get("location") === null &&
  response.headers.get("x-middleware-next") === "1";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function answerSessionWith(setCookies: string[]) {
  const fetchMock = mock(async () => {
    const headers = new Headers();
    for (const cookie of setCookies) headers.append("set-cookie", cookie);
    return new Response("{}", { headers });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("proxy", () => {
  it("lets a signed-in request through without calling the auth server", async () => {
    const fetchMock = answerSessionWith([]);
    const response = await proxy(request("/jobs", true));
    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Pages can't write cookies, so the proxy refreshes the expired cache before they render.
  it("refreshes an expired session cache for this render and the browser", async () => {
    const fetchMock = answerSessionWith([
      `${SESSION_DATA_COOKIE}=fresh; Path=/; Max-Age=300; HttpOnly; Secure`,
    ]);
    const response = await proxy(staleRequest("/jobs"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toContain(
      `${SESSION_DATA_COOKIE}=fresh`,
    );
    const renderCookies = response.headers.get("x-middleware-request-cookie");
    expect(renderCookies).toContain(`${SESSION_COOKIE}=abc`);
    expect(renderCookies).toContain(`${SESSION_DATA_COOKIE}=fresh`);
  });

  it("sends someone whose session has ended to the welcome screen", async () => {
    answerSessionWith([`${SESSION_COOKIE}=; Path=/; Max-Age=0`]);
    const response = await proxy(staleRequest("/jobs"));
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/welcome");
    expect(response.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=;`);
  });

  it("lets the page through when the refresh itself fails", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const response = await proxy(staleRequest("/jobs"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends a signed-out page request to the welcome screen, remembering where it was going", async () => {
    const location = new URL(
      (await proxy(request("/jobs?view=open"))).headers.get("location") ?? "",
    );
    expect(location.pathname).toBe("/welcome");
    expect(location.searchParams.get("redirectTo")).toBe("/jobs?view=open");
  });

  it("doesn't add a return path for the home page", async () => {
    const location = new URL(
      (await proxy(request("/"))).headers.get("location") ?? "",
    );
    expect(location.pathname).toBe("/welcome");
    expect(location.search).toBe("");
  });

  // A redirect's HTML breaks the action client, so the caller couldn't tell the call failed
  // (KTD4): the action runs, finds no session, and answers `unauthenticated` itself.
  it("lets a signed-out server action through instead of redirecting it", async () => {
    const fetchMock = answerSessionWith([]);
    const response = await proxy(actionRequest("/jobs"));
    expect(passedThrough(response)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets a server action through when the session has ended, without the ended session", async () => {
    answerSessionWith([`${SESSION_COOKIE}=; Path=/; Max-Age=0`]);
    const response = await proxy(
      actionRequest("/jobs", `${SESSION_COOKIE}=abc`),
    );
    expect(passedThrough(response)).toBe(true);
    expect(response.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=;`);
    expect(
      response.headers.get("x-middleware-request-cookie") ?? "",
    ).not.toContain(SESSION_COOKIE);
  });

  it("shows the welcome screen to a signed-out visitor", async () => {
    const response = await proxy(request("/welcome?redirectTo=/jobs"));
    expect(response.headers.get("location")).toBeNull();
  });

  // e.g. Back after signing in.
  it("sends a signed-in visitor past the welcome screen, to where they were going", async () => {
    const location = new URL(
      (await proxy(request("/welcome?redirectTo=/jobs", true))).headers.get(
        "location",
      ) ?? "",
    );
    expect(location.pathname).toBe("/jobs");
  });

  it("never sends anyone off-site from the welcome screen", async () => {
    const location = new URL(
      (
        await proxy(request("/welcome?redirectTo=//evil.example", true))
      ).headers.get("location") ?? "",
    );
    expect(location.origin).toBe("https://app.example");
    expect(location.pathname).toBe("/");
  });

  it("skips Neon's auth pages and routes, and robots.txt, which load signed out", () => {
    const [matcher] = config.matcher;
    const guarded = (path: string) => new RegExp(`^${matcher}$`).test(path);

    expect(guarded("/")).toBe(true);
    expect(guarded("/jobs")).toBe(true);
    expect(guarded("/welcome")).toBe(true);
    for (const path of ["/auth/sign-in", "/api/auth/session", "/robots.txt"]) {
      expect(guarded(path)).toBe(false);
    }
  });
});
