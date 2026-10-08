import { expect, it } from "bun:test";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
} from "@/tests/_support/app";

// D83, P26.3: a personal book or plan named for its owner follows their name when it changes,
// until someone renames it.
describeEachBackend("a space's automatic name", () => {
  const names = async (app: ReturnType<typeof makeApp>, userId: string) =>
    (await app.listMySpaces(userId, "recipe-book")).map((book) => book.name);

  it("follows its owner's name when it changes", async () => {
    const app = makeApp();
    await app.nameUser(OWNER, "Hector Gonzalez");
    const book = await app.ensurePersonalSpace(OWNER, "recipe-book");
    expect(book.name).toBe("Hector's Recipes");

    await app.nameUser(OWNER, "Héctor Gonzalez");
    expect(await names(app, OWNER)).toEqual(["Héctor's Recipes"]);
    expect((await app.ensurePersonalSpace(OWNER, "recipe-book")).name).toBe(
      "Héctor's Recipes",
    );
    // Someone it's shared with sees the owner's name too, not their own.
    await app.nameUser(PARTNER, "Maria");
    await app.join(book.id, PARTNER, "editor");
    expect(await names(app, PARTNER)).toEqual(["Héctor's Recipes"]);
  });

  it("stops following once it's renamed", async () => {
    const app = makeApp();
    await app.nameUser(OWNER, "Hector");
    const book = await app.ensurePersonalSpace(OWNER, "recipe-book");

    await app.renameSpace(book.id, "Weeknights", OWNER);
    await app.nameUser(OWNER, "Héctor");
    expect(await names(app, OWNER)).toEqual(["Weeknights"]);
  });

  it("is only a personal space's: a book made with a name keeps it", async () => {
    const app = makeApp();
    await app.nameUser(OWNER, "Hector");
    await app.newSpace("recipe-book", OWNER, "Hector's Recipes");
    await app.nameUser(OWNER, "Héctor");
    expect(await names(app, OWNER)).toEqual(["Hector's Recipes"]);
  });
});
