import { type Browser, expect, type Page, test } from "@playwright/test";

// A second member on the same phone and settings as the flow's own page, with cookies of their own.
export async function anotherMember(browser: Browser): Promise<Page> {
  const context = await browser.newContext(test.info().project.use);
  return context.newPage();
}

// A new account through the real sign-up (A2) on the test project, so one run never meets
// another's data: a fresh address and password each time, kept only by the flow that signs up.
// It starts from the welcome page, or from a friend link (A3), and lands on A4.
export async function signUp(
  page: Page,
  name: string,
  from = "/welcome",
): Promise<{ email: string; password: string }> {
  const account = {
    email: `flow-${crypto.randomUUID()}@example.test`,
    password: `pw-${crypto.randomUUID()}`,
  };
  await page.goto(from);
  await page.getByRole("button", { name: "Make an account" }).click();
  await page.getByPlaceholder("Name").fill(name);
  await page.getByPlaceholder("m@example.com").fill(account.email);
  await page.getByPlaceholder("Password").fill(account.password);
  await page.getByRole("button", { name: "Make my account" }).click();
  await expect(
    page.getByRole("heading", { name: "Set up your profile" }),
  ).toBeVisible();
  return account;
}

// A4 as it starts, then on through each step that follows to the Library: A5 after a friend link,
// then A6. Each step is waited for, since skipping them went unnoticed while they were optional
// here (2026-11-24). Names are matched exactly: Playwright matches a name's words anywhere by
// default, and "Next" then finds Next.js's own "Open Next.js Dev Tools" button on the dev server.
export async function setUpProfile(
  page: Page,
  { friend }: { friend?: string } = {},
) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
  if (friend) {
    await expect(
      page.getByRole("heading", { name: `You and ${friend} are friends` }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Put it on your home screen" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Go to my library" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Library" }),
  ).toBeVisible();
}
