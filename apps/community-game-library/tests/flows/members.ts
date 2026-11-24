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

const onStep = (page: Page, step: string) =>
  new URL(page.url()).pathname.startsWith(`/start/${step}`);

// A4 as it starts, then on through the steps that follow (A5 after a friend link, A6) to the
// Library. Names are matched exactly: Playwright matches a name's words anywhere by default, and
// "Next" then finds Next.js's own "Open Next.js Dev Tools" button on the dev server.
export async function setUpProfile(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/start/profile"));
  if (onStep(page, "friends")) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/start/friends"));
  }
  if (onStep(page, "home-screen")) {
    await page.getByRole("button", { name: "Go to my library" }).click();
  }
  await expect(
    page.getByRole("heading", { level: 1, name: "Library" }),
  ).toBeVisible();
}
