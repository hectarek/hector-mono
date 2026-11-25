import { expect, test } from "@playwright/test";
import { setUpProfile, signUp } from "@/tests/flows/members";

// U22 with the sign-in anonymized (Hector, 2026-11-24), on the test project's real Neon Auth
// tables: deleting an account (E8, E9) signs the member out, and its email and password no longer
// sign in, since its ways in are gone.
test("deletes an account, signs out, and its email and password no longer sign in", async ({
  page,
}) => {
  const account = await signUp(page, "Wren");
  await setUpProfile(page);

  await page.goto("/you/delete");
  await page
    .getByRole("button", { name: "Delete my account", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete my account", exact: true })
    .click();
  await page.waitForURL((url) => url.pathname === "/welcome");

  // Signed out: the app sends them back to the welcome page.
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/welcome");

  // By role: Next.js keeps the sign-up page it left in the DOM, hidden, and a role skips it.
  await page.goto("/auth/sign-in");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(account.email);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("That password doesn’t match this email."),
  ).toBeVisible();
});
