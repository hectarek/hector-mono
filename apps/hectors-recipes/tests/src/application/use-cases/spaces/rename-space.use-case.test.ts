import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("renameSpace", () => {
  let app: TestApp;
  let homeId: string;

  beforeEach(async () => {
    app = makeApp();
    homeId = await app.newSpace("recipe-book");
  });

  it("only the owner can rename", async () => {
    await app.join(homeId, PARTNER, "editor");
    await expect(
      app.renameSpace(homeId, "Mine now", PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
