import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";
import { signUp } from "@/tests/flows/sign-up";

// P28.3, D87: the Recipes tab gets the library ready before it's tapped. Inside `instant()`
// only what was ready before the tap shows, and the rest waits, so a library that still loads
// after the tap fails here. A recipe or Books opened again within 5 minutes also shows at once,
// but only in a production build: `next dev`, which the flows run on, fetches them again, so
// that is checked by hand (docs/ux-plan.md P28.3).
test("the Recipes tab shows the library the moment it's tapped", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/recipes/new/manual");
  await page.getByRole("textbox", { name: "Title" }).fill("Chili");
  await page
    .getByRole("textbox", { name: "Ingredient 1", exact: true })
    .fill("ground turkey");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Chili" })).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "Main" });

  await tabs.getByRole("link", { name: "Meal plan" }).click();
  await page.waitForURL(/\/plan/);
  await page.waitForLoadState("networkidle");
  await instant(page, async () => {
    await tabs.getByRole("link", { name: "Recipes" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("link", { name: /Chili/ })).toBeVisible();
  });
});
