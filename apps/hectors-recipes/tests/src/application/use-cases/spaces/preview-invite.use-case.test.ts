import { beforeEach, expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("previewInvite", () => {
  let app: TestApp;
  let homeId: string;

  beforeEach(async () => {
    app = makeApp();
    homeId = await app.newSpace("recipe-book");
  });

  it("shows what the link grants before joining", async () => {
    const invite = await app.createInvite(homeId, "editor", OWNER);
    expect(await app.previewInvite(invite.token, PARTNER)).toMatchObject({
      spaceName: "Home",
      spaceType: "recipe-book",
      role: "editor",
      alreadyMember: false,
    });
  });

  it("works signed out, without looking up membership", async () => {
    const invite = await app.createInvite(homeId, "viewer", OWNER);
    expect(await app.previewInvite(invite.token, undefined)).toMatchObject({
      spaceName: "Home",
      spaceType: "recipe-book",
      role: "viewer",
      alreadyMember: false,
    });
  });

  it("an unknown or revoked link isn't found", async () => {
    await expect(app.previewInvite("nope", PARTNER)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
