import { beforeEach, expect, it } from "bun:test";
import {
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("updateMemberRole", () => {
  let app: TestApp;
  let homeId: string;

  beforeEach(async () => {
    app = makeApp();
    homeId = await app.newSpace("recipe-book");
    await app.join(homeId, PARTNER, "editor");
  });

  it("the owner can demote a member but not themselves", async () => {
    await app.updateMemberRole(homeId, PARTNER, "viewer", OWNER);
    expect(await app.repos.spaces.getMemberRole(homeId, PARTNER)).toBe(
      "viewer",
    );
    await expect(
      app.updateMemberRole(homeId, OWNER, "viewer", OWNER),
    ).rejects.toBeInstanceOf(InputParseError);
  });

  it("an editor can't change roles", async () => {
    await expect(
      app.updateMemberRole(homeId, OWNER, "viewer", PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
