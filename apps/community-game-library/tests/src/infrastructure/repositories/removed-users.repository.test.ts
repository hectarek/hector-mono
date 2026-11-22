import { beforeEach, expect, it } from "bun:test";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, dev } = CAST.people;

describeEachBackend("IRemovedUsersRepository", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    app = makeApp();
  });

  // G8: the admin removed Dev's account.
  it("knows an account the admin removed, and no other", async () => {
    await app.addRemovedUser(dev.id);

    expect(await app.repos.removedUsers.isRemoved(dev.id)).toBe(true);
    expect(await app.repos.removedUsers.isRemoved(you.id)).toBe(false);
  });
});
