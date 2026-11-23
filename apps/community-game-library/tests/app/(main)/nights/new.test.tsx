import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, waitFor, within } from "@testing-library/react";

// The host the request came to; headers() works only inside a request.
mock.module("next/headers", () => ({
  headers: async () => new Headers({ host: "communitygamelibrary.com" }),
}));

const { APP_TOASTER } = await import("@/app/_lib/notify");
const { default: NewNightPage } = await import("@/app/(main)/nights/new/page");
const { default: NightPage } = await import("@/app/(main)/nights/[id]/page");
const { signInAsYouWithTheCast } = await import("@/tests/_support/members");
const { nextState } = await import("@/tests/_support/next");

async function renderNewNight() {
  await signInAsYouWithTheCast();
  const view = render(
    <>
      {await NewNightPage()}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
  const page = within(view.container);
  fireEvent.change(page.getByRole("textbox", { name: "Name" }), {
    target: { value: "Quiet night in" },
  });
  fireEvent.change(page.getByRole("textbox", { name: "Place" }), {
    target: { value: "Robin’s place" },
  });
  return { view, page };
}

describe("New game night (U18: D5, D6)", () => {
  beforeEach(() => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  it("creates a night for friends with a game from your library, which opens its page (Create a game night)", async () => {
    const { view, page } = await renderNewNight();
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "New game night",
    );
    // Tomorrow at 7 PM, for six, to start.
    expect(page.getByRole("button", { name: "Date" }).textContent).toBe(
      "Wed, Nov 11",
    );
    expect(page.getByText("6")).toBeTruthy();
    fireEvent.click(page.getByRole("button", { name: "One seat fewer" }));
    expect(page.getByText("5")).toBeTruthy();

    fireEvent.click(page.getByRole("button", { name: "Pick from my library" }));
    const sheet = within(await view.findByRole("dialog"));
    expect(
      sheet.getByText("Not lent to friends. Fine for your own night."),
    ).toBeTruthy();
    expect(sheet.getByText("Out with Jo now")).toBeTruthy();
    fireEvent.click(sheet.getByText("Night Market"));
    expect(await sheet.findByText("1 picked")).toBeTruthy();
    fireEvent.click(sheet.getByRole("button", { name: "Done" }));
    expect(
      await page.findByRole("button", { name: "Remove Night Market" }),
    ).toBeTruthy();

    const create = page.getByRole("button", { name: "Create game night" });
    fireEvent.submit(create.closest("form") as HTMLFormElement);
    expect(await view.findByText("Quiet night in is on Nights.")).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toHaveLength(1));
    const [href = ""] = nextState.pushed;
    expect(href).toMatch(/^\/nights\/[0-9a-f-]{36}$/);
    view.unmount();

    const night = within(
      render(
        await NightPage({
          params: Promise.resolve({ id: href.replace("/nights/", "") }),
        }),
      ).container,
    );
    expect(night.getByText("Wed, Nov 11 · 7 PM")).toBeTruthy();
    expect(night.getByText("Going · 1 of 5")).toBeTruthy();
    expect(night.getByText("Night Market")).toBeTruthy();
    expect(night.getByText("You bring it")).toBeTruthy();
  });

  it("goes on to Invite people for a night only invited people see", async () => {
    const { view, page } = await renderNewNight();
    fireEvent.click(page.getByRole("radio", { name: /^Only people I invite/ }));
    const create = await page.findByRole("button", {
      name: "Create and invite people",
    });
    fireEvent.submit(create.closest("form") as HTMLFormElement);
    expect(await view.findByText("Quiet night in is on Nights.")).toBeTruthy();
    await waitFor(() =>
      expect(nextState.pushed[0]).toMatch(/^\/nights\/[0-9a-f-]{36}\/invite$/),
    );
  });

  it("says what's missing under its field, and sends nothing", async () => {
    const { page } = await renderNewNight();
    fireEvent.change(page.getByRole("textbox", { name: "Name" }), {
      target: { value: " " },
    });
    fireEvent.submit(
      page
        .getByRole("button", { name: "Create game night" })
        .closest("form") as HTMLFormElement,
    );
    expect(await page.findByText("Name is required")).toBeTruthy();
    expect(nextState.pushed).toEqual([]);
  });
});
