import { beforeEach, describe, expect, it } from "bun:test";
import { gate } from "@/app/_lib/account";
import { AccountGate } from "@/app/(main)/account-gate";
import { removeAccount, signInAsMember } from "@/tests/_support/members";
import { nextState, Redirected, signInAsNewUser } from "@/tests/_support/next";

const wentTo = async (check: Promise<unknown>) => {
  const err = await check.catch((caught: unknown) => caught);
  expect(err).toBeInstanceOf(Redirected);
  return (err as Redirected).url;
};

// The gate after sign-in (KTD3): no profile goes to set one up, a removed account to /removed,
// everyone else gets the app.
describe("the gate after sign-in", () => {
  beforeEach(() => {
    signInAsNewUser();
  });

  it("sends a signed-out visit to the welcome page", async () => {
    nextState.userId = undefined;
    expect(await wentTo(gate("app"))).toBe("/welcome");
    expect(await wentTo(gate("start"))).toBe("/welcome");
    expect(await wentTo(gate("removed"))).toBe("/welcome");
  });

  describe("a member with no profile", () => {
    it("goes to the profile step from the app and the removed page", async () => {
      expect(await wentTo(gate("app"))).toBe("/start/profile");
      expect(await wentTo(gate("removed"))).toBe("/start/profile");
    });

    it("stays on the profile step", async () => {
      expect((await gate("start")).state).toBe("needs-profile");
    });
  });

  describe("a removed account", () => {
    beforeEach(() => {
      removeAccount(nextState.userId ?? "");
    });

    it("sees only /removed, wherever it goes", async () => {
      expect(await wentTo(gate("app"))).toBe("/removed");
      expect(await wentTo(gate("start"))).toBe("/removed");
      expect((await gate("removed")).state).toBe("removed");
    });

    it("sees /removed even with a profile", async () => {
      const userId = await signInAsMember();
      removeAccount(userId);
      expect(await wentTo(gate("app"))).toBe("/removed");
    });
  });

  describe("everyone else", () => {
    beforeEach(async () => {
      await signInAsMember({ name: "Quinn Sample" });
    });

    it("gets the app, with their own piece", async () => {
      const account = await gate("app");
      expect(account.me).toMatchObject({
        name: "Quinn Sample",
        pieceShape: "cone",
        pieceColor: "teal",
      });
    });

    it("is sent from the steps and the removed page to the app", async () => {
      expect(await wentTo(gate("start"))).toBe("/");
      expect(await wentTo(gate("removed"))).toBe("/");
    });
  });
});

// The signed-in layout runs the same gate beside every page (app/(main)/account-gate.tsx).
describe("the signed-in layout's gate", () => {
  it("lets a member through, and sends the rest where they belong", async () => {
    await signInAsMember();
    expect(await AccountGate()).toBeNull();

    signInAsNewUser();
    expect(await wentTo(AccountGate())).toBe("/start/profile");

    removeAccount(await signInAsMember());
    expect(await wentTo(AccountGate())).toBe("/removed");

    nextState.userId = undefined;
    expect(await wentTo(AccountGate())).toBe("/welcome");
  });
});
