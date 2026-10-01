import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  STRANGER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("acceptInvite", () => {
  let app: TestApp;
  let homeId: string;

  beforeEach(async () => {
    app = makeApp();
    homeId = await app.newSpace("recipe-book");
  });

  it("an editor invite lets the partner read and write", async () => {
    const invite = await app.createInvite(homeId, "editor", OWNER);
    await app.acceptInvite(invite.token, PARTNER);

    const recipe = await app.newRecipe(homeId, {}, PARTNER);
    expect(
      (await app.getRecipes(homeId, OWNER)).recipes.map((r) => r.id),
    ).toEqual([recipe.id]);
    expect(
      (await app.listMySpaces(PARTNER, "recipe-book")).map((s) => s.role),
    ).toEqual(["editor"]);
  });

  it("a view-only invite lets someone browse but not change anything", async () => {
    const invite = await app.createInvite(homeId, "viewer", OWNER);
    await app.acceptInvite(invite.token, STRANGER);

    expect((await app.getRecipes(homeId, STRANGER)).recipes).toEqual([]);
    await expect(app.newRecipe(homeId, {}, STRANGER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("re-joining never changes an existing role", async () => {
    const editorLink = await app.createInvite(homeId, "editor", OWNER);
    const viewerLink = await app.createInvite(homeId, "viewer", OWNER);
    await app.acceptInvite(editorLink.token, PARTNER);
    await app.acceptInvite(viewerLink.token, PARTNER);
    await app.acceptInvite(viewerLink.token, OWNER);

    expect(await app.repos.spaces.getMemberRole(homeId, PARTNER)).toBe(
      "editor",
    );
    expect(await app.repos.spaces.getMemberRole(homeId, OWNER)).toBe("owner");
  });
});

// Joining someone's plan (D15): an untouched plan of your own is replaced, one in use stays
// and you choose whether the joined plan becomes your default.
describeEachBackend("acceptInvite, for a plan", () => {
  let app: TestApp;
  let shared: string;
  let token: string;

  const plansOf = async (userId: string) =>
    (await app.listMySpaces(userId, "meal-plan")).map((plan) => ({
      id: plan.id,
      isDefault: plan.isDefault,
    }));

  beforeEach(async () => {
    app = makeApp();
    shared = await app.newSpace("meal-plan", OWNER);
    token = (await app.createInvite(shared, "editor", OWNER)).token;
  });

  it("with no plan of their own, the joined plan is their default", async () => {
    await app.acceptInvite(token, PARTNER);
    expect(await plansOf(PARTNER)).toEqual([{ id: shared, isDefault: true }]);
  });

  it("replaces an untouched plan of their own", async () => {
    await app.ensurePersonalSpace(PARTNER, "meal-plan");
    await app.acceptInvite(token, PARTNER);
    expect(await plansOf(PARTNER)).toEqual([{ id: shared, isDefault: true }]);
  });

  const uses: Record<string, (planId: string) => Promise<unknown>> = {
    "a meal": (planId) =>
      app.planMeal(planId, "2026-09-21", { userId: PARTNER }),
    "a grocery item": (planId) => app.addGroceryItem(planId, "Milk", PARTNER),
    "another person": (planId) => app.join(planId, STRANGER, "viewer"),
    "a live link": (planId) => app.createInvite(planId, "editor", PARTNER),
  };
  for (const [label, use] of Object.entries(uses)) {
    it(`keeps their own plan when it has ${label}`, async () => {
      const own = await app.ensurePersonalSpace(PARTNER, "meal-plan");
      await use(own.id);

      await app.acceptInvite(token, PARTNER);
      expect((await plansOf(PARTNER)).map((plan) => plan.id)).toContain(own.id);
    });
  }

  it("makes the joined plan the default only when they ask", async () => {
    const own = await app.ensurePersonalSpace(PARTNER, "meal-plan");
    await app.addGroceryItem(own.id, "Milk", PARTNER);
    await app.setDefaultSpace(PARTNER, "meal-plan", own.id);

    await app.acceptInvite(token, PARTNER);
    expect((await plansOf(PARTNER)).find((plan) => plan.isDefault)?.id).toBe(
      own.id,
    );

    const other = await app.newSpace("meal-plan", STRANGER);
    const link = await app.createInvite(other, "editor", STRANGER);
    await app.acceptInvite(link.token, PARTNER, { makeDefault: true });
    expect((await plansOf(PARTNER)).find((plan) => plan.isDefault)?.id).toBe(
      other,
    );
  });

  it("leaves their plans alone when they were already in it", async () => {
    await app.acceptInvite(token, PARTNER);
    const own = await app.ensurePersonalSpace(PARTNER, "meal-plan");

    await app.acceptInvite(token, PARTNER);
    expect((await plansOf(PARTNER)).map((plan) => plan.id)).toContain(own.id);
  });

  it("says whether joining would leave a plan of their own in use", async () => {
    expect((await app.previewInvite(token, PARTNER)).ownPlanInUse).toBe(false);
    const own = await app.ensurePersonalSpace(PARTNER, "meal-plan");
    expect((await app.previewInvite(token, PARTNER)).ownPlanInUse).toBe(false);
    await app.addGroceryItem(own.id, "Milk", PARTNER);
    expect((await app.previewInvite(token, PARTNER)).ownPlanInUse).toBe(true);
  });
});
