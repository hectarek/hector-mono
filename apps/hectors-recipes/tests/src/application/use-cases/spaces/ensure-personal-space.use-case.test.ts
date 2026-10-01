import { expect, it } from "bun:test";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
} from "@/tests/_support/app";

describeEachBackend("ensurePersonalSpace", () => {
  it("reuses the personal book instead of creating another", async () => {
    const app = makeApp();
    const book = await app.ensurePersonalSpace(OWNER, "recipe-book");
    expect((await app.ensurePersonalSpace(OWNER, "recipe-book")).id).toBe(
      book.id,
    );
  });

  it("names it after the owner, or plainly when the account has no name", async () => {
    const app = makeApp();
    await app.nameUser(OWNER, "Hector Gonzalez");

    expect((await app.ensurePersonalSpace(OWNER, "meal-plan")).name).toBe(
      "Hector's Plan",
    );
    expect((await app.ensurePersonalSpace(PARTNER, "meal-plan")).name).toBe(
      "My Plan",
    );
  });
});
