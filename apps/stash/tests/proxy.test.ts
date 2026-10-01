import { afterEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import proxy from "@/proxy";

const SESSION_COOKIE = "__Secure-neon-auth.session_token";
const SESSION_DATA_COOKIE = "__Secure-neon-auth.local.session_data";

const request = (cookie?: string) =>
  new NextRequest("https://stash.example/", {
    headers: cookie ? { cookie } : {},
  });
// Signed in, with the 5-minute cached copy of the session still present.
const signedIn = () =>
  request(`${SESSION_COOKIE}=abc; ${SESSION_DATA_COOKIE}=cached`);
// Signed in, but the cached copy has expired (the browser dropped it).
const stale = () => request(`${SESSION_COOKIE}=abc`);

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
  it("sends a signed-out visitor to sign in", async () => {
    const location = (await proxy(request())).headers.get("location");
    expect(new URL(location ?? "").pathname).toBe("/auth/sign-in");
  });

  it("lets a signed-in request through without calling the auth server", async () => {
    const fetchMock = answerSessionWith([]);
    expect((await proxy(signedIn())).headers.get("location")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Pages can't write cookies, so the proxy refreshes the expired cache before they render.
  it("refreshes an expired session cache for this render and the browser", async () => {
    const fetchMock = answerSessionWith([
      `${SESSION_DATA_COOKIE}=fresh; Path=/; Max-Age=300; HttpOnly; Secure`,
    ]);
    const response = await proxy(stale());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toContain(
      `${SESSION_DATA_COOKIE}=fresh`,
    );
    const renderCookies = response.headers.get("x-middleware-request-cookie");
    expect(renderCookies).toContain(`${SESSION_COOKIE}=abc`);
    expect(renderCookies).toContain(`${SESSION_DATA_COOKIE}=fresh`);
  });

  it("sends someone whose session has ended to sign in", async () => {
    answerSessionWith([`${SESSION_COOKIE}=; Path=/; Max-Age=0`]);
    const response = await proxy(stale());
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      "/auth/sign-in",
    );
    expect(response.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=;`);
  });

  it("lets the page through when the refresh itself fails", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect((await proxy(stale())).headers.get("location")).toBeNull();
  });
});
