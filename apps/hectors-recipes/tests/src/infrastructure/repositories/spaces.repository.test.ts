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

  // P26.3, D83: every read shows an automatic name as the owner's current one. getById reads
  // one table, where Drizzle leaves columns unqualified; Neon Auth's user table has a role.
  it("shows a personal space under its owner's current name in every read", async () => {
    await addAuthUser(OWNER, "Hector Gonzalez", "hector@example.com");
    const book = await app.ensurePersonalSpace(OWNER, "recipe-book");
    await app.newSpace("recipe-book", OWNER, "Weeknights");
    await addAuthUser(OWNER, "Héctor Gonzalez", "hector@example.com");

    const repository = postgresRepositories().spaces;
    expect((await repository.getById(book.id))?.name).toBe("Héctor's Recipes");
    expect((await repository.findOwned(OWNER, "recipe-book"))?.name).toBe(
      "Héctor's Recipes",
    );
    expect(
      (await repository.listForUser(OWNER, "recipe-book")).map(
        (space) => space.name,
      ),
    ).toEqual(["Héctor's Recipes", "Weeknights"]);
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
