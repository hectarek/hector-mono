import { expect, test } from "@playwright/test";
import { signUp } from "@/tests/flows/sign-up";
import { swipe } from "@/tests/flows/touch";

// P21.4: cook mode one screen at a time (D63) on a small phone, with real touches.
test.use({ viewport: { width: 375, height: 812 } });

test("cook a recipe one step at a time", async ({ page }) => {
  await signUp(page);

  await page.goto("/recipes/new/manual");
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
    .fill("Brown the ground turkey, breaking it up as it cooks.");
  await page.getByRole("button", { name: "Add step" }).click();
  await page
    .getByRole("textbox", { name: "Step 2" })
    .fill("Add the onion, then simmer, covered.");
  await page
    .getByRole("button", { name: "Timer, move or remove step 2" })
    .click();
  await page.getByRole("spinbutton", { name: "Timer (minutes)" }).fill("20");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Chili" })).toBeVisible();
  const recipe = page.url();

  // Gather: what's out gets ticked, then the first step.
  await page.getByRole("button", { name: "Cook" }).click();
  // A row you check off, as on Groceries (P27.3): tap its words; its checkbox is hidden.
  // Once cook mode is open: the recipe page lists "1 onion" too, and Next.js keeps it, hidden
  // (D88), so the text is found on the page that shows.
  await expect(
    page.getByText("Check off each ingredient as you get it out."),
  ).toBeVisible();
  await page
    .getByText("1 onion", { exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole("checkbox", { name: "1 onion" })).toBeChecked();
  await page.getByRole("button", { name: "Start cooking" }).click();
  await expect(page.getByText("Step 1 of 2")).toBeVisible();

  // A swipe left goes on, and a step's timer follows you back.
  const step = (text: RegExp) => page.getByText(text).filter({ visible: true });
  await swipe(page, step(/^Brown the ground turkey/), "left");
  await expect(page.getByText("Step 2 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Start 20-minute timer" }).click();
  await swipe(page, step(/^Add the onion/), "right");
  await expect(page.getByText("Step 1 of 2")).toBeVisible();
  await expect(page.getByRole("list", { name: "Timers" })).toContainText(
    "Step 2 · ",
  );

  // "Step 1 of 2" opens every step, to jump to one.
  await page.getByRole("button", { name: "Step 1 of 2" }).click();
  const steps = page.getByRole("dialog", { name: "Steps" });
  await expect(steps).toBeVisible();
  await steps.getByRole("button", { name: /Add the onion/ }).click();
  await expect(page.getByText("Step 2 of 2")).toBeVisible();

  // Phones reload a page you've switched away from: you're back on the same step.
  await page.reload();
  await expect(page.getByText("Picked up where you left off.")).toBeVisible();
  await expect(page.getByText("Step 2 of 2")).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();

  await page.getByRole("button", { name: "Finish" }).click();
  await expect(
    page.getByRole("heading", { name: "That's the last step" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to the recipe" }).click();
  await page.waitForURL(recipe);
});
