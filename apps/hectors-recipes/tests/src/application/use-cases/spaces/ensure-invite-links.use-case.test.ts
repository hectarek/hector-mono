import { beforeEach, describe, expect, it } from "bun:test";
import {
  DatabaseOperationError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import type {
  InviteRole,
  SpaceInvite,
} from "@/src/entities/models/space.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { SpacesRepository } from "@/src/infrastructure/repositories/spaces.repository";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  postgresRepositories,
  type TestApp,
} from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

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

// The check and the writes are one transaction (AGENTS.md Backend Rules): a failure partway
// leaves no half-made set of links behind.
describe("ensureInviteLinks (Postgres)", () => {
  class ViewerLinkFails extends SpacesRepository {
    override async createInvite(
      spaceId: string,
      role: InviteRole,
      createdBy: string,
      tx?: ITransaction,
    ): Promise<SpaceInvite> {
      if (role === "viewer") {
        throw new Error("connection lost");
      }
      return super.createInvite(spaceId, role, createdBy, tx);
    }
  }

  beforeEach(resetDatabase);

  it("makes no link when the second one fails", async () => {
    const app = makeApp({
      ...postgresRepositories(),
      spaces: new ViewerLinkFails(new MockLoggerService()),
    });
    const planId = await app.newSpace("meal-plan");

    await expect(app.ensureInviteLinks(planId, OWNER)).rejects.toBeInstanceOf(
      DatabaseOperationError,
    );
    expect(await sql("select 1 from space_invites")).toEqual([]);
  });
});
