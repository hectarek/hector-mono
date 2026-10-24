import { describe, expect, it } from "bun:test";
import ThisWeekPage from "@/app/(main)/page";
import { Redirected } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

describe("This week", () => {
  it("sends an account that isn't one of the app's two to the private screen", async () => {
    signInAs("stranger");
    const outcome = await ThisWeekPage().catch((err: unknown) => err);
    expect(outcome).toBeInstanceOf(Redirected);
    expect((outcome as Redirected).url).toBe("/private");
  });

  it("opens for Hector's session and Claude's", async () => {
    for (const account of ["owner", "agent"] as const) {
      signInAs(account);
      expect(await ThisWeekPage()).toBeTruthy();
    }
  });
});
