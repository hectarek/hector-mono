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
  STRANGER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("removeMember", () => {
  let app: TestApp;
  let homeId: string;

  beforeEach(async () => {
    app = makeApp();
    homeId = await app.newSpace("recipe-book");
  });

  it("the owner can remove someone, who then loses access", async () => {
    await app.join(homeId, PARTNER, "editor");
    await app.removeMember(homeId, PARTNER, OWNER);
    await expect(app.getRecipes(homeId, PARTNER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("a member can leave; the owner can't", async () => {
    await app.join(homeId, STRANGER, "viewer");
    await app.removeMember(homeId, STRANGER, STRANGER);
    expect(
      await app.repos.spaces.getMemberRole(homeId, STRANGER),
    ).toBeUndefined();

    await expect(app.removeMember(homeId, OWNER, OWNER)).rejects.toBeInstanceOf(
      InputParseError,
    );
  });

  it("only the owner can remove someone else", async () => {
    await app.join(homeId, PARTNER, "editor");
    await app.join(homeId, STRANGER, "viewer");
    await expect(
      app.removeMember(homeId, STRANGER, PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await app.repos.spaces.getMemberRole(homeId, STRANGER)).toBe(
      "viewer",
    );
  });
});
