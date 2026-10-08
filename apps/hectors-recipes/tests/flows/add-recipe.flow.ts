import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { signUp } from "@/tests/flows/sign-up";

// The test files, made in Chromium (tests/_support/files).
const file = (name: string) =>
  path.join(__dirname, "..", "_support", "files", name);

// Opens Add by photo or file and chooses `names` through its picker.
async function choose(page: Page, ...names: string[]) {
  await page.goto("/recipes/new/photo");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose a photo or file" }).click();
  await (await chooser).setFiles(names.map(file));
}

// D53, with the AI key left out (playwright.config.ts): a PDF too long to read is refused on
// the server before any read, and a file gets as far as the reader.
test("Add by photo or file refuses a long PDF, and sends a file to the reader", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Add recipe" }).click();
  await page.getByRole("link", { name: /Add by photo or file/ }).click();
  await expect(
    page.getByRole("heading", { name: "Add by photo or file" }),
  ).toBeVisible();

  await choose(page, "eleven-pages.pdf");
  // By its text: Next's route announcer is an alert too.
  await expect(
    page.getByText(
      "That PDF has more than 10 pages. For a long PDF like a cookbook, screenshot the recipe's pages instead.",
    ),
  ).toBeVisible();

  // With no AI key the reader can't answer: the file got as far as it.
  await choose(page, "chili.md");
  await expect(
    page.getByText("The recipe reader isn't answering. Try again in a minute."),
  ).toBeVisible();

  // D74: a Word document is opened on the phone, and its text gets as far as the reader too.
  await choose(page, "chili.docx");
  await expect(page.getByText("chili.docx")).toBeVisible();
  await expect(
    page.getByText("The recipe reader isn't answering. Try again in a minute."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add manually instead" }),
  ).toBeVisible();
});

// D53 with the real reader, a few cents a run: `FLOWS_AI=1 bun run test:flows`.
test("@ai reads a Markdown file, a PDF, and two photos of one recipe", async ({
  page,
}) => {
  test.setTimeout(600_000);
  await signUp(page);

  for (const [names, from] of [
    [["chili.md"], "file"],
    [["chili-two-pages.pdf"], "PDF"],
    [["chili-page-1.jpg", "chili-page-2.jpg"], "photos"],
  ] as const) {
    await choose(page, ...names);
    const read = page.getByText(
      `Read from your ${from}. Check it before saving.`,
    );
    // Whichever comes first, so a failed read stops the test at once, with its message.
    await expect(
      read.or(page.getByRole("main").getByRole("alert")),
    ).toBeVisible({ timeout: 150_000 });
    await expect(read).toBeVisible({ timeout: 1 });
    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(
      /weeknight chili/i,
    );
    await expect(
      page.getByRole("textbox", { name: /^Ingredient \d+$/ }),
    ).toHaveCount(8);
    await expect(page.getByRole("textbox", { name: /^Step \d+$/ })).toHaveCount(
      4,
    );
  }
});
