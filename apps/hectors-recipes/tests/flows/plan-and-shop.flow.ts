import { expect, test } from "@playwright/test";

// P15.7: the week's loop as a person does it, in a real browser, against the test project
// (playwright.config.ts). Each run signs up a new account, so runs never share data.
test("sign up, add a recipe, plan it, shop for it", async ({ page }) => {
  const email = `flow-${Date.now()}@example.test`;

  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Flow Tester");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page
    .getByRole("textbox", { name: "Password" })
    .fill(`pw-${crypto.randomUUID()}`);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Flow's Recipes" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "New" }).click();
  await page.getByRole("link", { name: /Add manually/ }).click();
  await page.getByRole("textbox", { name: "Title" }).fill("Chili");
  await page.getByRole("textbox", { name: "Amount, ingredient 1" }).fill("1");
  await page
    .getByRole("combobox", { name: "Unit, ingredient 1" })
    .selectOption("lb");
  await page
    .getByRole("textbox", { name: "Ingredient 1", exact: true })
    .fill("ground turkey");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByRole("textbox", { name: "Amount, ingredient 2" }).fill("1");
  await page
    .getByRole("textbox", { name: "Ingredient 2", exact: true })
    .fill("onion");
  await page
    .getByRole("textbox", { name: "Step 1" })
    .fill("Brown the turkey, then simmer.");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("heading", { name: "Chili" })).toBeVisible();
  await page.getByRole("button", { name: "Add to plan" }).click();
  const dialog = page.getByRole("dialog", { name: "Add to plan" });
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.getByText(/^Planned: /)).toBeVisible();
  await dialog.getByRole("button", { name: "Open plan" }).click();
  await page.waitForURL(/\/plan/);
  await page
    .getByRole("button", { name: "Add 1 meal to the grocery list" })
    .click();
  // Items, not meals: the turkey and the onion.
  await expect(page.getByRole("status")).toHaveText("2 added.");
  await page.getByRole("button", { name: "Open list" }).click();
  await page.waitForURL(/\/groceries/);

  // A row is a label around a hidden checkbox (the design system's pattern): tap its words.
  await page.getByText("1 lb ground turkey", { exact: true }).click();
  await page.getByText("1 onion", { exact: true }).click();
  const gotIt = page.getByRole("group").getByText("Got it (2)");
  await expect(page.getByText("Everything's in the cart.")).toBeVisible();
  await expect(gotIt).toBeVisible();

  // Saved, not only shown: the same after a reload, in Got it (closed until tapped). It's found
  // within its section because for a moment during a reload the page has its text twice.
  await page.reload();
  await gotIt.click();
  await expect(
    page.getByRole("checkbox", { name: "1 lb ground turkey for Chili" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "1 onion for Chili" }),
  ).toBeChecked();
});
