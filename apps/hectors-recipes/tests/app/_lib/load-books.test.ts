import { beforeEach, describe, expect, it } from "bun:test";
import { loadBooks } from "@/app/_lib/load-books";
import { getInjection } from "@/di/container";
import { NotFoundPage, signInAsNewUser } from "@/tests/_support/next";

describe("loadBooks", () => {
  let userId: string;

  beforeEach(() => {
    userId = signInAsNewUser();
  });

  it("always has a personal book, shown by default", async () => {
    const { books, current } = await loadBooks(userId, undefined);
    expect(books).toHaveLength(1);
    expect(current.name).toBe("My Recipes");
  });

  it("shows a book shared with them by default, and keeps their own", async () => {
    const owner = crypto.randomUUID();
    const shared = await getInjection("ICreateSpaceController")(
      { type: "recipe-book", name: "Ours" },
      owner,
    );
    const invite = await getInjection("ICreateInviteController")(
      { spaceId: shared.id, role: "viewer" },
      owner,
    );
    await getInjection("IAcceptInviteController")(
      { token: invite.token },
      userId,
    );

    const { books, current } = await loadBooks(userId, undefined);
    expect(current.id).toBe(shared.id);
    expect(books.map((book) => book.name).sort()).toEqual([
      "My Recipes",
      "Ours",
    ]);
  });

  it("404s for a book they're not in", async () => {
    await expect(loadBooks(userId, crypto.randomUUID())).rejects.toBeInstanceOf(
      NotFoundPage,
    );
  });
});
