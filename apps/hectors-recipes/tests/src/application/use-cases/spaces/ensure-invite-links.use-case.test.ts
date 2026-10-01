import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

// The Invite sheet's links (D20): one live link per role, made when first needed and reused
// after, so tapping Invite twice shares the same link.
describeEachBackend("ensureInviteLinks", () => {
  let app: TestApp;
  let planId: string;

  beforeEach(async () => {
    app = makeApp();
    planId = await app.newSpace("meal-plan");
  });

  it("makes a link for each role once, then reuses them", async () => {
    const first = await app.ensureInviteLinks(planId, OWNER);
    expect(first.editor.role).toBe("editor");
    expect(first.viewer.role).toBe("viewer");

    const again = await app.ensureInviteLinks(planId, OWNER);
    expect(again.editor.token).toBe(first.editor.token);
    expect(again.viewer.token).toBe(first.viewer.token);
    expect(await app.repos.spaces.listActiveInvites(planId)).toHaveLength(2);
  });

  it("reuses a live link made on the members page, and replaces one turned off", async () => {
    const made = await app.createInvite(planId, "editor", OWNER);
    expect((await app.ensureInviteLinks(planId, OWNER)).editor.token).toBe(
      made.token,
    );

    await app.revokeInvite(made.id, OWNER);
    expect((await app.ensureInviteLinks(planId, OWNER)).editor.token).not.toBe(
      made.token,
    );
  });

  it("is for the owner only", async () => {
    await app.join(planId, PARTNER, "editor");
    await expect(app.ensureInviteLinks(planId, PARTNER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
