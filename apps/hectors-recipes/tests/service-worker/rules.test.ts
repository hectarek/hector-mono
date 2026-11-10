import { describe, expect, it } from "bun:test";
import {
  isKeepable,
  markSaved,
  routeFor,
  SAVED_MARK,
} from "@/service-worker/rules";

const ORIGIN = "https://recipes.example";
const pageLoad = (path: string) => ({
  url: `${ORIGIN}${path}`,
  method: "GET",
  mode: "navigate" as const,
});

describe("routeFor", () => {
  it("saves the pages you read", () => {
    for (const path of [
      "/",
      "/?book=all",
      "/plan",
      "/plan?week=2026-11-09",
      "/groceries",
      "/books",
      "/recipes/abc",
      "/recipes/abc/cook",
    ]) {
      expect(routeFor(pageLoad(path), ORIGIN)).toBe("page");
    }
  });

  it("leaves the forms and the rest to the network", () => {
    for (const path of [
      "/recipes/new",
      "/recipes/new/manual",
      "/recipes/abc/edit",
      "/books/abc/copy",
      "/account/settings",
      "/auth/sign-in",
      "/spaces/abc/settings",
      "/join/token",
      "/shared/token",
    ]) {
      expect(routeFor(pageLoad(path), ORIGIN)).toBe("network");
    }
  });

  it("clears the saved pages on the way out", () => {
    expect(routeFor(pageLoad("/welcome"), ORIGIN)).toBe("sign-out");
    expect(routeFor(pageLoad("/auth/sign-out"), ORIGIN)).toBe("sign-out");
  });

  it("leaves RSC requests, server actions and other sites alone", () => {
    const rsc = { url: `${ORIGIN}/plan`, method: "GET", mode: "cors" as const };
    const action = { ...pageLoad("/plan"), method: "POST" };
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
