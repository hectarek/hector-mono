import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";
import { signUp } from "@/tests/flows/sign-up";

// P28.3, D87: the library, Books and a recipe opened in the last 5 minutes show the moment
// they're tapped. Inside `instant()` only what was ready before the tap shows, and the rest
// waits, so a screen that still loads after the tap fails here.
test("the library, Books and a recipe you opened show at once", async ({
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

  // The Recipes tab gets the library ready while you're on another tab.
  await tabs.getByRole("link", { name: "Meal plan" }).click();
  await page.waitForURL(/\/plan/);
  await page.waitForLoadState("networkidle");
  await instant(page, async () => {
    await tabs.getByRole("link", { name: "Recipes" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("link", { name: /Chili/ })).toBeVisible();
  });

  // A recipe opened a moment ago.
  await page.getByRole("link", { name: /Chili/ }).click();
  await expect(page.getByRole("heading", { name: "Chili" })).toBeVisible();
  await tabs.getByRole("link", { name: "Recipes" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await instant(page, async () => {
    await page.getByRole("link", { name: /Chili/ }).click();
    await page.waitForURL(/\/recipes\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Chili" })).toBeVisible();
  });

  // Books, once its link has been on screen (in the library's ⋯).
  await tabs.getByRole("link", { name: "Recipes" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await page.getByRole("button", { name: /^More for / }).click();
  await page.waitForLoadState("networkidle");
  await instant(page, async () => {
    await page.getByRole("button", { name: "All books" }).click();
    await page.waitForURL(/\/books$/);
    await expect(page.getByText("1 recipe")).toBeVisible();
  });

  // Your own save clears what was kept: a new recipe is in the library straight away.
  await tabs.getByRole("link", { name: "Recipes" }).click();
  await page.getByRole("button", { name: "Add recipe" }).click();
  await page.getByRole("link", { name: /Add manually/ }).click();
  await page.getByRole("textbox", { name: "Title" }).fill("Soup");
  await page
    .getByRole("textbox", { name: "Ingredient 1", exact: true })
    .fill("onion");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Soup" })).toBeVisible();
  await tabs.getByRole("link", { name: "Recipes" }).click();
  await expect(page.getByRole("link", { name: /Soup/ })).toBeVisible();
});
