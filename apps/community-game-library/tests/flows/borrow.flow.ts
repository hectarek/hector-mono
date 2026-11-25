import { expect, test } from "@playwright/test";
import { anotherMember, setUpProfile, signUp } from "@/tests/flows/members";

// The catalog's only game of that name (checked on the test project, 2026-11-24), so search finds
// it alone.
const GAME = "Jaipur";

// KTD22: borrowing a friend's game, picking it up, giving it back and the owner confirming it, end
// to end on two phones (B8, E2, A3, B5, C1, C2, C3, C5, C8).
test("borrows a friend's game, picks it up, gives it back, and the owner confirms it's back", async ({
  page: owner,
  browser,
}) => {
  // Wren owns the game and shares a friend link.
  await signUp(owner, "Wren");
  await setUpProfile(owner);
  await owner.goto("/my-library/add");
  await owner.getByLabel("Search the catalog").fill(GAME);
  await owner.getByRole("button", { name: "I own it", exact: true }).click();
  await expect(owner.getByText("Added", { exact: true })).toBeVisible();
  // The link opens as a sheet over Friends (E2).
  await owner.goto("/friends");
  await owner.getByRole("button", { name: "Share my friend link" }).click();
  const address = await owner
    .getByRole("dialog", { name: "Your friend link" })
    .getByText(/\/f\//)
    .textContent();
  const link = address?.match(/\/f\/\S+/)?.[0];
  expect(link).toBeTruthy();
  // Its page's old address, in links and bookmarks from before, opens Friends with it open, and
  // the address it leaves is Friends' own, so a reload doesn't open it again.
  await owner.goto("/friends/link");
  await expect(owner).toHaveURL(/\/friends$/);
  await expect(
    owner
      .getByRole("dialog", { name: "Your friend link" })
      .getByText(String(link)),
  ).toBeVisible();

  // Ira joins through it, and they're friends at once.
  const borrower = await anotherMember(browser);
  await signUp(borrower, "Ira", link);
  await setUpProfile(borrower, { friend: "Wren" });

  // Ira asks to borrow it from the game's page. Setting up ends on My library (A6 opens A7), and
  // Wren's game is under All friends.
  await borrower.goto("/");
  await borrower.getByRole("link", { name: new RegExp(GAME) }).click();
  await borrower.getByRole("button", { name: "Borrow", exact: true }).click();
  await borrower
    .getByRole("dialog")
    .getByRole("button", { name: "Send request" })
    .click();
  await expect(borrower.getByText("Request sent to Wren.")).toBeVisible();

  // Wren says yes.
  await owner.goto("/loans");
  await owner
    .getByRole("link", { name: new RegExp(`Ira asked for ${GAME}`) })
    .click();
  await owner.getByRole("button", { name: "Send answer" }).click();
  await expect(owner.getByText("You said yes. Ira is told.")).toBeVisible();

  // Ira picks it up, then gives it back.
  await borrower.goto("/loans");
  await borrower.getByRole("link", { name: new RegExp(GAME) }).click();
  await borrower.getByRole("button", { name: "I’ve picked it up" }).click();
  await expect(borrower.getByText("The loan has started.")).toBeVisible();
  await borrower
    .getByRole("button", { name: "I gave it back to Wren" })
    .click();
  await expect(
    borrower.getByText("Wren is asked to confirm it’s back."),
  ).toBeVisible();

  // Wren confirms it's back.
  await owner.goto("/loans");
  await owner.getByRole("link", { name: new RegExp(GAME) }).click();
  await owner.getByRole("button", { name: "Answer", exact: true }).click();
  await owner
    .getByRole("dialog")
    .getByRole("button", { name: "Yes, it’s back" })
    .click();
  await expect(owner.getByText(new RegExp(`${GAME} is back`))).toBeVisible();
});
