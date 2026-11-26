import { expect, type Page, test } from "@playwright/test";
import { signUp } from "@/tests/flows/sign-up";
import { swipe } from "@/tests/flows/touch";

// P32.5 on a small phone, with real touches: Recently viewed is the library's default order,
// from the recipes this person opened (D106), and a swipe right on a recipe goes back (D105).
test.use({ viewport: { width: 375, height: 812 } });

async function addRecipe(page: Page, title: string) {
  await page.goto("/recipes/new/manual");
  await page.getByRole("textbox", { name: "Title" }).fill(title);
  await page
    .getByRole("textbox", { name: "Ingredient 1", exact: true })
    .fill("water");
  await page.getByRole("textbox", { name: "Step 1" }).fill("Cook it.");
  await page.getByRole("button", { name: "Save" }).click();
  // Saving opens the recipe, which counts as viewing it.
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

// Each card's words: its tile's letter, its title and its tags.
const cards = (page: Page) =>
  page.getByRole("main").getByRole("list").getByRole("link").allTextContents();
const titled = (...titles: string[]) =>
  titles.map((title) => expect.stringContaining(title));

test("orders the library by what you opened, and a swipe right goes back", async ({
  page,
  context,
}) => {
  await signUp(page);
  await addRecipe(page, "Apple Cake");
  await addRecipe(page, "Zucchini Soup");

  // Opened last comes first, though A to Z would put it last.
  await page.goto("/");
  await expect
    .poll(() => cards(page))
    .toEqual(titled("Zucchini Soup", "Apple Cake"));

  // From the library into Apple Cake, then a swipe right goes back to the library.
  await page.getByRole("link", { name: /Apple Cake/ }).click();
  const heading = page.getByRole("heading", { name: "Apple Cake" });
  await expect(heading).toBeVisible();
  await swipe(page, heading, "right");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("combobox", { name: "Sort and group" }),
  ).toBeVisible();

  // The order catches up on the library's next load, not under your finger. Reloaded until it
  // does: in development, Next.js answers a page's private cache from memory while it renders
  // a fresh one (its 'use cache: private' docs), which production never stores.
  await expect
    .poll(async () => {
      await page.reload();
      return cards(page);
    })
    .toEqual(titled("Apple Cake", "Zucchini Soup"));

  // Opened from a link, with no page before it in the app: the swipe goes to its book.
  await page.getByRole("link", { name: /Zucchini Soup/ }).click();
  await expect(
    page.getByRole("heading", { name: "Zucchini Soup" }),
  ).toBeVisible();
  const fromLink = await context.newPage();
  await fromLink.goto(page.url());
  const soup = fromLink.getByRole("heading", { name: "Zucchini Soup" });
  await expect(soup).toBeVisible();
  await swipe(fromLink, soup, "right");
  await expect(fromLink).toHaveURL(/\/(\?book=[\w-]+)?$/);
  await expect(
    fromLink.getByRole("combobox", { name: "Sort and group" }),
  ).toBeVisible();
});
