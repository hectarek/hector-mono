import { expect, type Page } from "@playwright/test";

// A new account through the real sign-up screen, on the test project, so flows never share
// data. Lands on its own empty book.
export async function signUp(page: Page, name = "Flow Tester") {
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill(name);
  await page
    .getByRole("textbox", { name: "Email" })
    .fill(`flow-${crypto.randomUUID()}@example.test`);
  await page
    .getByRole("textbox", { name: "Password" })
    .fill(`pw-${crypto.randomUUID()}`);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: `${name.split(" ")[0]}'s Recipes` }),
  ).toBeVisible();
}
