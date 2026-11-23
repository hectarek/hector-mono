import { describe, expect, it } from "bun:test";
import {
  isKeepable,
  markSaved,
  routeFor,
  SAVED_MARK,
} from "@/service-worker/rules";

const ORIGIN = "https://communitygamelibrary.example";
const pageLoad = (path: string) => ({
  url: `${ORIGIN}${path}`,
  method: "GET",
  mode: "navigate" as const,
});

describe("routeFor", () => {
  it("saves the pages you read", () => {
    for (const path of [
      "/",
      "/?q=harbor",
      "/my-library",
      "/games/abc",
      "/copies/abc",
      "/loans",
      "/loans/abc",
      "/nights",
      "/nights/abc",
      "/friends",
      "/friends/abc",
      "/inbox",
      "/you",
    ]) {
      expect(routeFor(pageLoad(path), ORIGIN)).toBe("page");
    }
  });

  it("leaves the forms and the rest to the network", () => {
    for (const path of [
      "/my-library/add",
      "/my-library/suggest",
      "/loans/past",
      "/loans/record",
      "/loans/abc/pass-along",
      "/nights/new",
      "/nights/past",
      "/nights/abc/edit",
      "/nights/abc/invite",
      "/nights/abc/what-to-play",
      "/nights/abc/tables",
      "/nights/abc/calendar",
      "/friends/link",
      "/you/edit",
      "/you/notices",
      "/you/delete",
      "/admin",
      "/admin/accounts",
      "/start/profile",
      "/account/settings",
      "/auth/sign-in",
      "/f/K7Q2-HARB",
      "/n/7QK2-MARR",
    ]) {
      expect(routeFor(pageLoad(path), ORIGIN)).toBe("network");
    }
  });

  it("clears the saved pages on the way out", () => {
    expect(routeFor(pageLoad("/welcome"), ORIGIN)).toBe("sign-out");
    expect(routeFor(pageLoad("/auth/sign-out"), ORIGIN)).toBe("sign-out");
    expect(routeFor(pageLoad("/removed"), ORIGIN)).toBe("sign-out");
  });

  it("leaves RSC requests, server actions and other sites alone", () => {
    const rsc = {
      url: `${ORIGIN}/loans`,
      method: "GET",
      mode: "cors" as const,
    };
    const action = { ...pageLoad("/loans"), method: "POST" };
    const elsewhere = pageLoad("/").url.replace(
      ORIGIN,
      "https://other.example",
    );
    expect(routeFor(rsc, ORIGIN)).toBe("network");
    expect(routeFor(action, ORIGIN)).toBe("network");
    expect(routeFor({ ...pageLoad("/"), url: elsewhere }, ORIGIN)).toBe(
      "network",
    );
  });

  it("keeps the build files", () => {
    const script = {
      url: `${ORIGIN}/_next/static/chunks/main-abc123.js`,
      method: "GET",
      mode: "no-cors" as const,
    };
    expect(routeFor(script, ORIGIN)).toBe("static");
  });
});

describe("isKeepable", () => {
  const html = { "content-type": "text/html; charset=utf-8" };

  it("keeps a page", () => {
    expect(isKeepable(new Response("<html>", { headers: html }))).toBe(true);
  });

  it("doesn't keep an error, a redirect or anything but a page", () => {
    expect(
      isKeepable(new Response("<html>", { status: 500, headers: html })),
    ).toBe(false);
    expect(isKeepable(Response.redirect(`${ORIGIN}/welcome`, 307))).toBe(false);
    expect(
      isKeepable(
        new Response("{}", { headers: { "content-type": "application/json" } }),
      ),
    ).toBe(false);
  });
});

describe("markSaved", () => {
  it("marks the page's root element, once", () => {
    const marked = markSaved(
      '<!DOCTYPE html><html lang="en"><head></head></html>',
    );
    expect(marked).toBe(
      `<!DOCTYPE html><html ${SAVED_MARK}="" lang="en"><head></head></html>`,
    );
    expect(marked.match(new RegExp(SAVED_MARK, "g"))).toHaveLength(1);
  });
});
