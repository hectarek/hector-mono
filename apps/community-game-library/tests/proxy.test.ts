import { afterEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import proxy, { config } from "@/proxy";

const SESSION_COOKIE = "__Secure-neon-auth.session_token";
const SESSION_DATA_COOKIE = "__Secure-neon-auth.local.session_data";

// Signed in, with the cached copy of the session (kept a day) still present.
const request = (path: string, signedIn = false) =>
  new NextRequest(`https://library.example${path}`, {
    headers: signedIn
      ? { cookie: `${SESSION_COOKIE}=abc; ${SESSION_DATA_COOKIE}=cached` }
      : {},
  });

// Signed in, but the cached copy has expired (the browser dropped it).
const staleRequest = (path: string) =>
  new NextRequest(`https://library.example${path}`, {
    headers: { cookie: `${SESSION_COOKIE}=abc` },
  });

// A server action call: a POST to the page's own path, named by the Next-Action header.
const actionRequest = (path: string) =>
  new NextRequest(`https://library.example${path}`, {
    method: "POST",
    headers: { "next-action": "action-id" },
  });

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

const locationOf = (response: Response) =>
  new URL(response.headers.get("location") ?? "");

describe("proxy", () => {
  // A Google sign-in comes back to the page it started from, with a verifier and no session yet.
  it("swaps the verifier from a Google sign-in for the session, then goes on without it", async () => {
    const session = `${SESSION_COOKIE}=fresh; Path=/; HttpOnly; Secure`;
    const asked: string[] = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      asked.push(String(input));
      return new Response("{}", { headers: { "set-cookie": session } });
    }) as unknown as typeof fetch;
    const response = await proxy(
      request("/my-library?neon_auth_session_verifier=one-time"),
    );
    expect(asked).toEqual([
      "https://library.example/api/auth/get-session?neon_auth_session_verifier=one-time",
    ]);
    expect(locationOf(response).href).toBe(
      "https://library.example/my-library",
    );
    expect(response.headers.getSetCookie()).toEqual([session]);
  });

  it("goes on to the page without the verifier when the swap can't reach auth", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const response = await proxy(request("/?neon_auth_session_verifier=x"));
    expect(locationOf(response).href).toBe("https://library.example/");
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("lets a signed-in request through without calling the auth server", async () => {
    const fetchMock = answerSessionWith([]);
    const response = await proxy(request("/loans", true));
    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Pages can't write cookies, so the proxy refreshes the expired cache before they render.
  it("refreshes an expired session cache for this render and the browser", async () => {
    const fetchMock = answerSessionWith([
      `${SESSION_DATA_COOKIE}=fresh; Path=/; Max-Age=86400; HttpOnly; Secure`,
    ]);
    const response = await proxy(staleRequest("/loans"));

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
    const response = await proxy(staleRequest("/loans"));
    expect(locationOf(response).pathname).toBe("/welcome");
    expect(response.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=;`);
  });

  it("lets the page through when the refresh itself fails", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const response = await proxy(staleRequest("/loans"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends a signed-out visitor to the welcome screen, remembering where they were going", async () => {
    const location = locationOf(await proxy(request("/games/abc?from=search")));
    expect(location.pathname).toBe("/welcome");
    expect(location.searchParams.get("redirectTo")).toBe(
      "/games/abc?from=search",
    );
  });

  it("lets a signed-out visitor open a friend link, and nothing under it", async () => {
    const response = await proxy(request("/f/K7Q2-HARB"));
    expect(response.headers.get("location")).toBeNull();
    expect(locationOf(await proxy(request("/f/K7Q2-HARB/more"))).pathname).toBe(
      "/welcome",
    );
    expect(locationOf(await proxy(request("/friends"))).pathname).toBe(
      "/welcome",
    );
  });

  it("lets a signed-out visitor open a night's link, and nothing under it", async () => {
    const response = await proxy(request("/n/7QK2-MARR"));
    expect(response.headers.get("location")).toBeNull();
    expect(locationOf(await proxy(request("/n/7QK2-MARR/more"))).pathname).toBe(
      "/welcome",
    );
    expect(locationOf(await proxy(request("/nights"))).pathname).toBe(
      "/welcome",
    );
  });

  // Google's consent screen links to both.
  it("lets a signed-out visitor read the privacy policy and the terms, and nothing under them", async () => {
    for (const path of ["/privacy", "/terms"]) {
      expect((await proxy(request(path))).headers.get("location")).toBeNull();
      expect(locationOf(await proxy(request(`${path}/more`))).pathname).toBe(
        "/welcome",
      );
    }
  });

  it("doesn't add a return path for the home page", async () => {
    const location = locationOf(await proxy(request("/")));
    expect(location.pathname).toBe("/welcome");
    expect(location.search).toBe("");
  });

  // As recipes' proxy answers one: job-search lets these through, this app doesn't.
  it("sends a signed-out server action to the welcome screen too", async () => {
    const fetchMock = answerSessionWith([]);
    const location = locationOf(await proxy(actionRequest("/loans")));
    expect(location.pathname).toBe("/welcome");
    expect(location.searchParams.get("redirectTo")).toBe("/loans");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the welcome screen to a signed-out visitor", async () => {
    const response = await proxy(request("/welcome?redirectTo=/loans"));
    expect(response.headers.get("location")).toBeNull();
  });

  // e.g. Back after signing in.
  it("sends a signed-in visitor past the welcome screen, to where they were going", async () => {
    const location = locationOf(
      await proxy(request("/welcome?redirectTo=/loans", true)),
    );
    expect(location.pathname).toBe("/loans");
  });

  it("never sends anyone off-site from the welcome screen", async () => {
    const location = locationOf(
      await proxy(request("/welcome?redirectTo=//evil.example", true)),
    );
    expect(location.origin).toBe("https://library.example");
    expect(location.pathname).toBe("/");
  });

  // The steps before the app, You and the removed page need a session like any page; their gate
  // after sign-in is the pages' own (app/_lib/account.ts).
  it("guards the setup steps and the removed page like any page", async () => {
    for (const path of [
      "/start/profile",
      "/start/home-screen",
      "/removed",
      "/you",
    ]) {
      expect(
        (await proxy(request(path, true))).headers.get("location"),
      ).toBeNull();
      expect(locationOf(await proxy(request(path))).pathname).toBe("/welcome");
    }
  });

  // Neon's forms open signed out, and the route handlers check their own access.
  it("guards the app's pages and the welcome screen, and skips Neon's forms and the routes", () => {
    const [matcher] = config.matcher;
    const guarded = (path: string) => new RegExp(`^${matcher}$`).test(path);

    for (const path of ["/", "/loans", "/games/abc", "/welcome"]) {
      expect(guarded(path)).toBe(true);
    }
    for (const path of [
      "/auth/sign-in",
      "/auth/sign-up",
      "/api/auth/get-session",
      "/_next/static/chunks/app.js",
      // A phone and a chat app fetch these without cookies (KTD19, U23).
      "/manifest.webmanifest",
      "/icon.svg",
      "/apple-icon.png",
      "/icons/icon-192.png",
      "/sw.js",
      "/previews/friend.png",
    ]) {
      expect(guarded(path)).toBe(false);
    }
  });
});
