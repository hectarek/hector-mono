import { expect, test } from "@playwright/test";
import { setUpProfile, signUp } from "@/tests/flows/members";

// KTD22: making an account and setting up a profile, end to end on a phone (A1, A2, A4, A6).
test("makes an account, sets up a profile and lands in the Library", async ({
  page,
}) => {
  await signUp(page, "Wren");
  await setUpProfile(page);
  // A new member has no friends yet (A7).
  await expect(page.getByText("No friends yet")).toBeVisible();
});
