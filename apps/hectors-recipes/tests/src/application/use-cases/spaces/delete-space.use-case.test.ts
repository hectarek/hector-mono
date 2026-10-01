import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("deleteSpace", () => {
  let app: TestApp;
  let homeId: string;

  beforeEach(async () => {
    app = makeApp();
    homeId = await app.newSpace("recipe-book");
  });

  it("only the owner can delete", async () => {
    await app.join(homeId, PARTNER, "editor");
    await expect(app.deleteSpace(homeId, PARTNER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
