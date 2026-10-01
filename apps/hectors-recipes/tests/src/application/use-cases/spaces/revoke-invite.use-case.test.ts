import { beforeEach, expect, it } from "bun:test";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  STRANGER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("revokeInvite", () => {
  let app: TestApp;
  let homeId: string;

  beforeEach(async () => {
    app = makeApp();
    homeId = await app.newSpace("recipe-book");
  });

  it("a revoked link stops working, and only the owner can revoke", async () => {
    const invite = await app.createInvite(homeId, "editor", OWNER);
    await app.acceptInvite(invite.token, PARTNER);

    await expect(app.revokeInvite(invite.id, PARTNER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await app.revokeInvite(invite.id, OWNER);
    await expect(
      app.acceptInvite(invite.token, STRANGER),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      app.previewInvite(invite.token, STRANGER),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
