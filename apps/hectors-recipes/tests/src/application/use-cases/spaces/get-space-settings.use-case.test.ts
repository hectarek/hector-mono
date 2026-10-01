import { beforeEach, expect, it } from "bun:test";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("getSpaceSettings", () => {
  let app: TestApp;
  let homeId: string;

  beforeEach(async () => {
    app = makeApp();
    homeId = await app.newSpace("recipe-book");
  });

  it("members see who's in, owner first, but only the owner sees invite links", async () => {
    await app.createInvite(homeId, "editor", OWNER);
    await app.join(homeId, PARTNER, "editor");

    const settings = await app.getSpaceSettings(homeId, PARTNER);
    expect(settings.invites).toEqual([]);
    expect(settings.members.map((m) => m.role)).toEqual(["owner", "editor"]);
  });
});
