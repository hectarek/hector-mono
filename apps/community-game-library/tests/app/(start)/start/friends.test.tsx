import { beforeEach, describe, expect, it } from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, within } from "@testing-library/react";
import { APP_TOASTER } from "@/app/_lib/notify";
import FriendsStepPage from "@/app/(start)/start/friends/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";
import { Redirected } from "@/tests/_support/next";

const { sam } = CAST.people;

const step = (friend?: string) =>
  FriendsStepPage({
    searchParams: Promise.resolve(friend ? { friend } : {}),
  });

describe("A5, step 2 of setting up", () => {
  let userId: string;
  beforeEach(async () => {
    await signInAsYouWithTheCast();
    const token = (await getInjection("IGetFriendLinkController")(sam.id))
      .token;
    // A newcomer who joined through Sam's link and set up their profile.
    userId = await signInAsMember();
    await getInjection("IOpenFriendLinkController")({ token }, userId);
  });

  it("draws A5: friends with Sam, and the people Sam knows", async () => {
    const view = render(await step(sam.id));
    const page = within(view.container);

    expect(page.getByText("Step 2 of 3")).toBeTruthy();
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "You and Sam are friends",
    );
    expect(
      page.getByText(
        "You can see Sam’s library and game nights, and Sam can see yours.",
      ),
    ).toBeTruthy();
    // Each row: the name, the friend they share, and Add friend.
    expect(page.getAllByRole("listitem").map((row) => row.textContent)).toEqual(
      ["Alice", "Ben", "Jo", "Noor", "Priya", "Robin Vale"].map(
        (name) => `${name}Friend of SamAdd friend`,
      ),
    );
    expect(page.getByText("They get a request to accept.")).toBeTruthy();
    expect(
      page
        .getByRole("button", { name: "Next" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/start/home-screen");
  });

  it("asks Alice with one tap", async () => {
    const view = render(
      <>
        {await step(sam.id)}
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    const alice = within(view.getByText("Alice").closest("li") as HTMLElement);
    fireEvent.click(alice.getByRole("button", { name: "Add friend" }));
    expect(await view.findByText("Request sent to Alice.")).toBeTruthy();

    const again = render(await step(sam.id));
    const asked = within(
      within(again.container).getByText("Alice").closest("li") as HTMLElement,
    );
    expect(asked.getByText("You asked")).toBeTruthy();
    expect(asked.getByRole("button", { name: "Cancel request" })).toBeTruthy();
  });

  it("goes on to step 3 when the address names no friend", async () => {
    for (const friend of [undefined, CAST.people.noor.id, "sam"]) {
      const err = await step(friend).catch((caught: unknown) => caught);
      expect(err).toBeInstanceOf(Redirected);
      expect((err as Redirected).url).toBe("/start/home-screen");
    }
  });
});
