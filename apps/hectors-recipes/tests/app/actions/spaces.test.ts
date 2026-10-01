import { beforeEach, describe, expect, it } from "bun:test";
import {
  acceptInvite,
  adoptRecipes,
  createBook,
  createInvite,
  deleteSpace,
  removeMember,
  renameSpace,
  revokeInvite,
  setDefaultSpace,
  setMemberRole,
  startOwnPlan,
} from "@/app/actions/spaces";
import { getInjection } from "@/di/container";
import { form } from "@/tests/_support/form";
import { nextState, Redirected, signInAsNewUser } from "@/tests/_support/next";

// Runs an action that should redirect and returns where it went.
async function redirectOf(run: Promise<unknown>): Promise<string> {
  const outcome = await run.catch((err) => err);
  expect(outcome).toBeInstanceOf(Redirected);
  return (outcome as Redirected).url;
}

const newSpace = (type: "recipe-book" | "meal-plan", userId: string) =>
  getInjection("ICreateSpaceController")({ type, name: "Home" }, userId);

describe("space actions", () => {
  let userId: string;

  beforeEach(() => {
    userId = signInAsNewUser();
  });

  it("a new book opens straight away", async () => {
    const url = await redirectOf(
      createBook(null, form({ name: "Weeknights" })),
    );
    expect(url).toStartWith("/?book=");
    const books = await getInjection("IListMySpacesController")(
      { type: "recipe-book" },
      userId,
    );
    expect(books.map((book) => book.name)).toEqual(["Weeknights"]);
  });

  it("renames and confirms", async () => {
    const book = await newSpace("recipe-book", userId);
    expect(
      await renameSpace(null, form({ spaceId: book.id, name: "Kitchen" })),
    ).toEqual({
      message: "Saved",
    });
  });

  it("deleting lands on that type's tab", async () => {
    const plan = await newSpace("meal-plan", userId);
    expect(
      await redirectOf(deleteSpace(null, form({ spaceId: plan.id }))),
    ).toBe("/plan");
  });

  it("joining by link opens the shared space", async () => {
    const owner = crypto.randomUUID();
    const plan = await newSpace("meal-plan", owner);
    nextState.userId = owner;
    await createInvite(null, form({ spaceId: plan.id, role: "editor" }));
    const [invite] = (
      await getInjection("IGetSpaceSettingsController")(
        { spaceId: plan.id },
        owner,
      )
    ).invites;

    nextState.userId = userId;
    expect(
      await redirectOf(
        acceptInvite(null, form({ token: invite?.token ?? "" })),
      ),
    ).toBe(`/plan?plan=${plan.id}`);
  });

  it("joining a plan with the box ticked makes it their default", async () => {
    const own = await newSpace("meal-plan", userId);
    await getInjection("IAddGroceryItemController")(
      { spaceId: own.id, text: "Milk" },
      userId,
    );
    const owner = crypto.randomUUID();
    const plan = await newSpace("meal-plan", owner);
    const invite = await getInjection("ICreateInviteController")(
      { spaceId: plan.id, role: "editor" },
      owner,
    );

    await redirectOf(
      acceptInvite(null, form({ token: invite.token, makeDefault: "on" })),
    );
    const plans = await getInjection("IListMySpacesController")(
      { type: "meal-plan" },
      userId,
    );
    expect(plans.find((candidate) => candidate.isDefault)?.id).toBe(plan.id);
  });

  it("starting their own plan opens it as their default", async () => {
    const url = await redirectOf(startOwnPlan());
    const plans = await getInjection("IListMySpacesController")(
      { type: "meal-plan" },
      userId,
    );
    expect(plans).toMatchObject([{ role: "owner", isDefault: true }]);
    expect(url).toBe(`/plan?plan=${plans[0]?.id}`);
  });

  it("choosing All recipes clears the default book", async () => {
    const book = await newSpace("recipe-book", userId);
    const books = () =>
      getInjection("IListMySpacesController")({ type: "recipe-book" }, userId);
    await setDefaultSpace(
      null,
      form({ type: "recipe-book", spaceId: book.id }),
    );
    expect((await books())[0]?.isDefault).toBe(true);

    expect(
      await setDefaultSpace(null, form({ type: "recipe-book", spaceId: "" })),
    ).toEqual({ message: "Saved" });
    expect((await books())[0]?.isDefault).toBe(false);
  });

  it("the owner manages people: turn off a link, change a role, remove someone", async () => {
    const book = await newSpace("recipe-book", userId);
    const partner = crypto.randomUUID();
    await createInvite(null, form({ spaceId: book.id, role: "editor" }));
    const settings = () =>
      getInjection("IGetSpaceSettingsController")({ spaceId: book.id }, userId);
    const [invite] = (await settings()).invites;
    await getInjection("IAcceptInviteController")(
      { token: invite?.token ?? "" },
      partner,
    );

    expect(
      await revokeInvite(null, form({ inviteId: invite?.id ?? "" })),
    ).toBeNull();
    expect(
      await setMemberRole(
        null,
        form({ spaceId: book.id, memberId: partner, role: "viewer" }),
      ),
    ).toBeNull();
    expect((await settings()).members.map((m) => m.role)).toEqual([
      "owner",
      "viewer",
    ]);

    // Removing someone else stays on the page (no redirect).
    expect(
      await removeMember(null, form({ spaceId: book.id, memberId: partner })),
    ).toBeNull();
    expect((await settings()).members).toHaveLength(1);
    expect((await settings()).invites).toEqual([]);
    expect(nextState.revalidated).toContain(`/spaces/${book.id}/settings`);
  });

  it("anyone else gets told no, and nothing changes", async () => {
    const theirs = await newSpace("recipe-book", crypto.randomUUID());
    const refused = { error: "You do not have access to this space" };
    expect(
      await renameSpace(null, form({ spaceId: theirs.id, name: "Mine" })),
    ).toEqual(refused);
    expect(await deleteSpace(null, form({ spaceId: theirs.id }))).toEqual(
      refused,
    );
    expect(
      await createInvite(null, form({ spaceId: theirs.id, role: "editor" })),
    ).toEqual(refused);
    expect(await createBook(null, form({ name: " " }))).toEqual({
      error: "Name is required",
      fields: { name: "Name is required" },
    });
  });

  describe("leaving", () => {
    let spaceId: string;

    beforeEach(async () => {
      const owner = crypto.randomUUID();
      spaceId = (await newSpace("meal-plan", owner)).id;
      await getInjection("IAcceptInviteController")(
        {
          token: (
            await getInjection("ICreateInviteController")(
              { spaceId, role: "viewer" },
              owner,
            )
          ).token,
        },
        userId,
      );
    });

    it("goes to the space's tab afterwards", async () => {
      expect(
        await redirectOf(
          removeMember(
            null,
            form({ spaceId, memberId: userId, home: "/plan" }),
          ),
        ),
      ).toBe("/plan");
    });

    it("only ever redirects inside the app, whatever the form says", async () => {
      expect(
        await redirectOf(
          removeMember(
            null,
            form({ spaceId, memberId: userId, home: "https://evil.example" }),
          ),
        ),
      ).toBe("/");
    });
  });

  it("copies the checked recipes into the chosen book and opens it", async () => {
    const source = await getInjection("IEnsurePersonalSpaceController")(
      "recipe-book",
      userId,
    );
    const target = await newSpace("recipe-book", userId);
    const ids = await Promise.all(
      ["Soup", "Salad"].map(
        async (title) =>
          (
            await getInjection("ICreateRecipeController")(
              {
                spaceId: source.id,
                data: { title, ingredients: [{ raw: "1 onion" }] },
              },
              userId,
            )
          ).id,
      ),
    );

    expect(
      await redirectOf(
        adoptRecipes(null, form({ targetSpaceId: target.id, recipeId: ids })),
      ),
    ).toBe(`/?book=${target.id}`);
    const copied = await getInjection("IGetRecipesController")(
      { spaceId: target.id },
      userId,
    );
    expect(copied.recipes.map((recipe) => recipe.title)).toEqual([
      "Salad",
      "Soup",
    ]);
  });
});
