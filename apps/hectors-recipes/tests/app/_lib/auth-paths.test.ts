import { describe, expect, it } from "bun:test";
import { skipsWhenSignedIn } from "@/app/_lib/auth-paths";

describe("skipsWhenSignedIn", () => {
  it("sends someone already signed in past sign-in and sign-up", () => {
    expect(skipsWhenSignedIn("sign-in")).toBe(true);
    expect(skipsWhenSignedIn("sign-up")).toBe(true);
  });

  it("lets a signed-in person reach sign-out, which needs a session to end", () => {
    expect(skipsWhenSignedIn("sign-out")).toBe(false);
  });
});
