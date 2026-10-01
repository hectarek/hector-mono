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

describeEachBackend("setDefaultSpace", () => {
  let app: TestApp;
  let mine: string;
  let shared: string;

  const defaultOf = async (userId: string, type: "meal-plan" | "recipe-book") =>
    (await app.listMySpaces(userId, type)).find((space) => space.isDefault)?.id;

  beforeEach(async () => {
    app = makeApp();
    mine = await app.newSpace("meal-plan");
    shared = await app.newSpace("meal-plan", PARTNER);
    await app.join(shared, OWNER, "viewer");
  });

  it("marks the plan they chose, for them only, and changes it", async () => {
    await app.setDefaultSpace(OWNER, "meal-plan", shared);
    expect(await defaultOf(OWNER, "meal-plan")).toBe(shared);
    expect(await defaultOf(PARTNER, "meal-plan")).toBeUndefined();

    await app.setDefaultSpace(OWNER, "meal-plan", mine);
    expect(await defaultOf(OWNER, "meal-plan")).toBe(mine);
  });

  it("keeps a book and a plan choice apart, and clears a book to All recipes", async () => {
    const book = await app.newSpace("recipe-book");
    await app.setDefaultSpace(OWNER, "meal-plan", mine);
    await app.setDefaultSpace(OWNER, "recipe-book", book);
    expect(await defaultOf(OWNER, "recipe-book")).toBe(book);

    await app.setDefaultSpace(OWNER, "recipe-book", null);
    expect(await defaultOf(OWNER, "recipe-book")).toBeUndefined();
    expect(await defaultOf(OWNER, "meal-plan")).toBe(mine);
  });

  it("only takes a space of that type they're in", async () => {
    const theirs = await app.newSpace("meal-plan", STRANGER);
    await expect(
      app.setDefaultSpace(OWNER, "meal-plan", theirs),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      app.setDefaultSpace(OWNER, "recipe-book", mine),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("still lets the owner delete a plan someone has as their default", async () => {
    await app.setDefaultSpace(OWNER, "meal-plan", shared);
    await app.deleteSpace(shared, PARTNER);
    expect(await defaultOf(OWNER, "meal-plan")).toBeUndefined();
  });
});
