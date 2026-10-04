import { expect, type Page, test } from "@playwright/test";

// A one-finger swipe across the middle of the week's first day, as touch events from the
// screen (Chromium's DevTools protocol): Playwright's own touchscreen only taps.
async function swipe(page: Page, direction: "left" | "right") {
  const day = await page
    .getByRole("heading", { level: 2 })
    .first()
    .boundingBox();
  if (!day) throw new Error("No day to swipe on");
  const y = day.y + day.height / 2;
  const middle = day.x + day.width / 2;
  const [from, to] =
    direction === "left"
      ? [middle + 75, middle - 75]
      : [middle - 75, middle + 75];
  const screen = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x?: number) =>
    screen.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: x === undefined ? [] : [{ x, y }],
    });
  await touch("touchStart", from);
  for (let step = 1; step <= 5; step++) {
    await touch("touchMove", from + ((to - from) * step) / 5);
  }
  await touch("touchEnd");
  await screen.detach();
}

// P15.7: the week's loop as a person does it, in a real browser, against the test project
// (playwright.config.ts). Each run signs up a new account, so runs never share data.
test("sign up, add a recipe, plan it, shop for it, start the list over", async ({
  page,
}) => {
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

  // D51: a swipe across the week, with real touches, goes to the next week and back.
  const week = page.getByRole("navigation", { name: "Week" });
  await expect(week).toContainText("This week");
  await swipe(page, "left");
  await expect(week).not.toContainText("This week");
  await swipe(page, "right");
  await expect(week).toContainText("This week");

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

  // D52: start the list over from the ⋯ sheet, after it asks, and Plan can add the meal again.
  await page.getByRole("button", { name: /^More for / }).click();
  await page.getByRole("button", { name: "Clear list" }).click();
  const question = page.getByRole("group", { name: "Clear the whole list?" });
  await expect(question).toContainText("all 2 items");
  await question.getByRole("button", { name: "Clear list" }).click();
  await expect(page.getByText("List cleared.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/^The list is empty/)).toBeVisible();
  await page.getByRole("link", { name: "Plan" }).click();
  await expect(
    page.getByRole("button", { name: "Add 1 meal to the grocery list" }),
  ).toBeVisible();
});
