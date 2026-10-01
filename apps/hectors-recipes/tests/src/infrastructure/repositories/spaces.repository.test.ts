import { beforeEach, describe, expect, it } from "bun:test";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import {
  makeApp,
  OWNER,
  PARTNER,
  postgresRepositories,
  STRANGER,
  type TestApp,
} from "@/tests/_support/app";
import { addAuthUser, resetDatabase, sql } from "@/tests/_support/database";

// What only the real database can show; behaviour shared with the mock is covered by
// the use-case tests, which run against both.
describe("SpacesRepository (Postgres)", () => {
  let app: TestApp;

  beforeEach(async () => {
    await resetDatabase();
    app = makeApp(postgresRepositories());
  });

  it("a space can only ever have one owner", async () => {
    const bookId = await app.newSpace("recipe-book");
    await expect(
      sql(
        "insert into space_members (space_id, user_id, role) values ($1, $2, 'owner')",
        [bookId, PARTNER],
      ),
    ).rejects.toThrow();
  });

  it("members come back owner first, with names from Neon Auth", async () => {
    const bookId = await app.newSpace("recipe-book");
    await addAuthUser(OWNER, "Hector", "h@example.com");
    await app.join(bookId, STRANGER, "viewer");
    await app.join(bookId, PARTNER, "editor");

    expect(await app.repos.spaces.listMembers(bookId)).toEqual([
      expect.objectContaining({ userId: OWNER, role: "owner", name: "Hector" }),
      expect.objectContaining({ userId: PARTNER, role: "editor", name: null }),
      expect.objectContaining({ userId: STRANGER, role: "viewer" }),
    ]);
  });

  it("role changes and removals never touch the owner", async () => {
    const bookId = await app.newSpace("recipe-book");
    await app.repos.spaces.updateMemberRole(bookId, OWNER, "viewer");
    await app.repos.spaces.removeMember(bookId, OWNER);
    expect(await app.repos.spaces.getMemberRole(bookId, OWNER)).toBe("owner");
  });

  it("deleting a space deletes everything in it", async () => {
    const bookId = await app.newSpace("recipe-book");
    await app.newRecipe(bookId);
    await app.createInvite(bookId, "editor", OWNER);
    await app.join(bookId, PARTNER, "editor");

    await app.deleteSpace(bookId, OWNER);
    for (const table of [
      "recipes",
      "recipe_ingredients",
      "space_members",
      "space_invites",
    ]) {
      expect(await sql(`select 1 from ${table}`)).toEqual([]);
    }
  });

  it("two first visits at once still create one personal space", async () => {
    const [a, b] = await Promise.all([
      app.ensurePersonalSpace(OWNER, "meal-plan"),
      app.ensurePersonalSpace(OWNER, "meal-plan"),
    ]);
    expect(a.id).toBe(b.id);
    expect(await app.listMySpaces(OWNER, "meal-plan")).toHaveLength(1);
  });

  it("wraps database failures in DatabaseOperationError", async () => {
    await expect(
      app.repos.spaces.create(
        { type: "not-a-type" as never, name: "x" },
        OWNER,
      ),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
  });
});
