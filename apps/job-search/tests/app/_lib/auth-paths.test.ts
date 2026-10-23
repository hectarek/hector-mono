import { describe, expect, it } from "bun:test";
import { AUTH_PATHS, skipsWhenSignedIn } from "@/app/_lib/auth-paths";

describe("AUTH_PATHS", () => {
  it("holds Neon's view paths, so any other path is a 404", () => {
    expect(AUTH_PATHS).toContain("sign-in");
    expect(AUTH_PATHS).toContain("sign-out");
    expect(AUTH_PATHS).not.toContain("nope");
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
