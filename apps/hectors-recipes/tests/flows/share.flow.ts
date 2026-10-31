import { type Browser, expect, type Page, test } from "@playwright/test";
import { signUp } from "@/tests/flows/sign-up";

// P29.4: a recipe's view-only public link (D98, D99), end to end on a phone.
test.use({ viewport: { width: 375, height: 812 } });

// Someone without the app's cookies, on the same phone and settings as the flow's own page.
async function visitor(browser: Browser): Promise<Page> {
  const context = await browser.newContext(test.info().project.use);
  return context.newPage();
}

test("share a recipe with someone who isn't signed in, then turn the link off", async ({
  page,
  browser,
}) => {
  // What the phone's share sheet is given, kept where the flow can read it.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        Object.assign(window, { sharedUrl: data.url });
      },
    });
  });
  await signUp(page);

  await page.goto("/recipes/new/manual");
  await page.getByRole("textbox", { name: "Title" }).fill("Lentil Soup");
  await page.getByRole("spinbutton", { name: "Servings" }).fill("4");
  await page.getByRole("textbox", { name: "Amount, ingredient 1" }).fill("2");
  await page
    .getByRole("combobox", { name: "Unit, ingredient 1" })
    .selectOption("cup");
  await page
    .getByRole("textbox", { name: "Ingredient 1", exact: true })
    .fill("red lentils");
  await page
    .getByRole("textbox", { name: "Step 1" })
    .fill("Simmer the lentils until soft.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "Lentil Soup" }),
  ).toBeVisible();
  const recipe = page.url();

  // The editor turns the link on and shares it.
  await page.getByRole("button", { name: "More for Lentil Soup" }).click();
  await page.getByRole("button", { name: "View-only link" }).click();
  await page.getByRole("button", { name: "Turn on view-only link" }).click();
  await page.getByRole("button", { name: "Share view-only link" }).click();
  const link = await page.evaluate(() =>
    String(Reflect.get(window, "sharedUrl")),
  );
  expect(link).toMatch(/\/shared\/[\w-]{24}$/);

  // Someone signed out reads it, changes the servings, and has nothing else to do.
  const guest = await visitor(browser);
  await guest.goto(link);
  await expect(
    guest.getByRole("heading", { name: "Lentil Soup" }),
  ).toBeVisible();
  await guest.getByRole("button", { name: "More servings" }).click();
  await expect(guest.getByText("2½ cups red lentils")).toBeVisible();
  await expect(guest.getByRole("button", { name: "Cook" })).toHaveCount(0);
  await expect(
    guest.getByRole("button", { name: "Add to groceries" }),
  ).toHaveCount(0);

  // Create account brings them back to the recipe, signed in, where they can cook it.
  await guest.getByRole("button", { name: "Create account" }).click();
  await guest.getByRole("textbox", { name: "Name" }).fill("Flow Guest");
  await guest
    .getByRole("textbox", { name: "Email" })
    .fill(`flow-${crypto.randomUUID()}@example.test`);
  await guest
    .getByRole("textbox", { name: "Password" })
    .fill(`pw-${crypto.randomUUID()}`);
  await guest.getByRole("button", { name: "Create account" }).click();
  await guest.waitForURL(recipe);
  await expect(guest.getByRole("button", { name: "Cook" })).toBeVisible();

  // The editor turns it off, asked first, and the link no longer opens.
  await page.getByRole("button", { name: "Turn off link" }).click();
  await page.getByRole("button", { name: "Turn off", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Turn on view-only link" }),
  ).toBeVisible();
  const late = await visitor(browser);
  await late.goto(link);
  await expect(late.getByText("Not found")).toBeVisible();
});
