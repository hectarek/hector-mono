import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("createInvite", () => {
  let app: TestApp;
  let homeId: string;

  beforeEach(async () => {
    app = makeApp();
    homeId = await app.newSpace("recipe-book");
  });

  it("only the owner can make invite links", async () => {
    await app.join(homeId, PARTNER, "editor");
    await expect(
      app.createInvite(homeId, "editor", PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect((await app.createInvite(homeId, "viewer", OWNER)).role).toBe(
      "viewer",
    );
  });
});
