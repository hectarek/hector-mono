import { describe, expect, it } from "bun:test";
import {
  ACCOUNT_HREF,
  ACCOUNT_PATHS,
  AUTH_PATHS,
  SIGN_OUT_HREF,
  skipsWhenSignedIn,
} from "@/app/_lib/auth-paths";

describe("AUTH_PATHS and ACCOUNT_PATHS", () => {
  it("hold Neon's view paths, so any other path is a 404", () => {
    expect(AUTH_PATHS).toContain("sign-in");
    expect(AUTH_PATHS).toContain("sign-up");
    expect(AUTH_PATHS).toContain("sign-out");
    expect(ACCOUNT_PATHS).toContain("settings");
    expect(AUTH_PATHS).not.toContain("nope");
  });
});

// The account pages and sign-out live where the proxy lets them: /auth opens signed out, and
// /account/[path] is a signed-in page.
describe("ACCOUNT_HREF and SIGN_OUT_HREF", () => {
  it("point at Neon's account settings and its sign-out view", () => {
    expect(ACCOUNT_HREF).toBe("/account/settings");
    expect(SIGN_OUT_HREF).toBe("/auth/sign-out");
  });
});

describe("skipsWhenSignedIn", () => {
  it("sends someone already signed in past sign-in and sign-up", () => {
    expect(skipsWhenSignedIn("sign-in")).toBe(true);
    expect(skipsWhenSignedIn("sign-up")).toBe(true);
  });

  it("lets a signed-in person reach sign-out, which needs a session to end", () => {
    expect(skipsWhenSignedIn("sign-out")).toBe(false);
  });
});
