import { expect, test } from "@playwright/test";
import { setUpProfile, signUp } from "@/tests/flows/members";

// KTD22: making an account and setting up a profile, end to end on a phone (A1, A2, A4, A6), and
// You saying how it signs in (E5), read from the test project's real Neon Auth tables.
test("makes an account, sets up a profile, lands in the Library, and You says it signs in with a password", async ({
  page,
}) => {
  const account = await signUp(page, "Wren");
  await setUpProfile(page);
  // A new member has no friends yet (A7).
  await expect(page.getByText("No friends yet")).toBeVisible();

  await page.goto("/you");
  await expect(
    page.getByText(`Signed in with a password · ${account.email}`),
  ).toBeVisible();
});
