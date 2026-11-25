import { beforeEach, expect, it } from "bun:test";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice, sam, priya } = CAST.people;

// How a member signs in, for E5's account line (Hector, 2026-11-25): read from their own sign-in
// in Neon Auth's tables.
describeEachBackend("how a member signs in (E5)", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    app = makeApp();
  });

  it("reads Google, a password, or both, with Google first", async () => {
    await app.addSignIn(
      { userId: you.id, name: you.name, email: "robin@example.com" },
      ["google"],
    );
    await app.addSignIn(
      { userId: alice.id, name: alice.name, email: "alice@example.com" },
      ["password"],
    );
    await app.addSignIn(
      { userId: sam.id, name: sam.name, email: "sam@example.com" },
      ["password", "google"],
    );
    expect(await app.listWaysIn(you.id)).toEqual(["google"]);
    expect(await app.listWaysIn(alice.id)).toEqual(["password"]);
    expect(await app.listWaysIn(sam.id)).toEqual(["google", "password"]);
  });

  it("reads none for an account with no sign-in, or one whose sign-in was anonymized", async () => {
    expect(await app.listWaysIn(priya.id)).toEqual([]);
    await app.addSignIn(
      { userId: priya.id, name: priya.name, email: "priya@example.com" },
      ["google", "password"],
    );
    await app.repos.transactions.startTransaction((tx) =>
      app.repos.signIns.anonymize(priya.id, tx),
    );
    expect(await app.listWaysIn(priya.id)).toEqual([]);
    expect(await app.repos.signIns.listEmails([priya.id])).toEqual([
      { userId: priya.id, email: `deleted-${priya.id}@deleted.invalid` },
    ]);
  });
});
