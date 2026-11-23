import "@/tests/_support/as-admin";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { APP_TOASTER } from "@/app/_lib/notify";
import RemoveAccountPage from "@/app/(main)/admin/accounts/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";
import { NotFoundPage, nextState } from "@/tests/_support/next";

const { dev } = CAST.people;
const searching = (q: string) =>
  RemoveAccountPage({ searchParams: Promise.resolve({ q }) });
const withToaster = (page: ReactNode) =>
  render(
    <>
      {page}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );

describe("Remove an account (U22: G8)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  it("finds Dev by name, with when Dev joined, Dev's games and open loans", async () => {
    const view = render(await searching("dev"));
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Remove an account",
    );
    const found = view.getByRole("radio", { name: /Dev/ });
    expect(found.getAttribute("aria-checked")).toBe("true");
    expect(
      view.getByText("Joined Nov 2026").closest("label")?.textContent,
    ).toBe("DevJoined Nov 20260 games · 0 open loans");
    expect(
      view
        .getByRole("button", { name: "Remove Dev’s account" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("says when no account has the name, and finds nobody for an empty search", async () => {
    expect(
      render(await searching("zed")).getByText("No account has that name."),
    ).toBeTruthy();
    expect(render(await searching("")).queryByRole("radio") === null).toBe(
      true,
    );
  });

  it("switches removal off for an account with a game out", async () => {
    const view = render(await searching("alice"));
    expect(
      view.getByText("Alice’s loans have to be settled first."),
    ).toBeTruthy();
    expect(
      view
        .getByRole("button", { name: "Remove Alice’s account" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("is Not found for anyone but the admin", async () => {
    await signInAsMember();
    expect(
      await searching("dev").catch((caught: unknown) => caught),
    ).toBeInstanceOf(NotFoundPage);
  });

  // Last: Dev's account is gone from the container's repositories after it.
  it("removes Dev after its dialog, then opens Admin with the message, and Dev sees only /removed", async () => {
    const view = withToaster(await searching("dev"));
    fireEvent.click(view.getByRole("button", { name: "Remove Dev’s account" }));
    const dialog = within(await view.findByRole("alertdialog"));
    expect(dialog.getByText("Remove Dev’s account?")).toBeTruthy();
    expect(
      dialog.getByText(
        "Dev can’t sign in again. Their games disappear from everyone’s library. This can’t be undone.",
      ),
    ).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Keep it" })).toBeTruthy();
    fireEvent.click(
      dialog.getByRole("button", { name: "Remove Dev’s account" }),
    );
    expect(await view.findByText("Dev’s account is removed")).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toEqual(["/admin"]));
    expect(
      await getInjection("IRemovedUsersRepository").isRemoved(dev.id),
    ).toBe(true);
    expect(
      await getInjection("IUserProfilesRepository").getByUserId(dev.id),
    ).toBeUndefined();
  });
});
