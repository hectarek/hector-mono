import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, within } from "@testing-library/react";
import { APP_TOASTER } from "@/app/_lib/notify";
import GamePage from "@/app/(main)/games/[id]/page";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";

const { games } = CAST;

// The page as the server renders it, with the toaster its messages show in.
const renderGame = async () =>
  render(
    <>
      {
        await GamePage({
          params: Promise.resolve({ id: games.harborLights.id }),
          searchParams: Promise.resolve({}),
        })
      }
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
// Each copy's row by its name.
const row = (view: ReturnType<typeof render>, name: string) => {
  const item = within(view.container)
    .getAllByRole("listitem")
    .find((li) => li.textContent?.startsWith(name));
  if (!item) {
    throw new Error(`No row for ${name}`);
  }
  return within(item);
};

describe("a copy's line on a game's page (U15: B5, B13, C10)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("offers Borrow that instead, which turns C10 into Ask to borrow for Sam's copy", async () => {
    const view = await renderGame();
    fireEvent.click(
      row(view, "Alice’s copy").getByRole("button", { name: "Join the line" }),
    );
    const sheet = within(await view.findByRole("dialog"));
    fireEvent.click(
      sheet.getByRole("button", {
        name: "Sam’s copy is available. Borrow that instead",
      }),
    );
    expect(sheet.getByText("Ask to borrow")).toBeTruthy();
    expect(sheet.getByText("Sam’s copy · available")).toBeTruthy();
    expect(sheet.getByRole("button", { name: "Send request" })).toBeTruthy();
  });

  it("joins the line for Alice's copy from C10, which then reads 2nd in line, and leaves it after asking", async () => {
    const view = await renderGame();
    fireEvent.click(
      row(view, "Alice’s copy").getByRole("button", { name: "Join the line" }),
    );
    const sheet = within(await view.findByRole("dialog"));
    expect(sheet.getByRole("heading", { name: "Join the line" })).toBeTruthy();
    expect(
      sheet.getByText("Alice’s copy · Ben has it until Nov 20"),
    ).toBeTruthy();
    expect(sheet.getByText("1st")).toBeTruthy();
    expect(sheet.getByText("You, 2nd")).toBeTruthy();
    // Your place to come is your own piece, the mustard pawn, with a dashed outline.
    const yourPlace = sheet
      .getByText("You, 2nd")
      .closest("li")
      ?.querySelector("path");
    expect(yourPlace?.getAttribute("data-color")).toBe(
      CAST.people.you.pieceColor,
    );
    expect(yourPlace?.getAttribute("stroke-dasharray")).toBe("3 2.5");
    expect(sheet.getByText("Jo, then you")).toBeTruthy();
    expect(
      sheet.getByText(
        "When it’s your turn, Alice is asked to lend it to you. Earliest: after Ben’s loan ends Nov 20, and Jo’s turn.",
      ),
    ).toBeTruthy();
    fireEvent.change(sheet.getByLabelText(/Note for Alice/), {
      target: { value: "No rush." },
    });
    fireEvent.submit(
      sheet
        .getByRole("button", { name: "Join the line" })
        .closest("form") as HTMLFormElement,
    );
    expect(
      await view.findByText("You joined the line. Alice is told."),
    ).toBeTruthy();

    // The request's revalidation renders the page again.
    view.unmount();
    const inLine = await renderGame();
    const alices = row(inLine, "Alice’s copy");
    expect(alices.getByText("2nd in line")).toBeTruthy();
    fireEvent.click(alices.getByRole("button", { name: "Leave the line" }));
    const dialog = within(await inLine.findByRole("alertdialog"));
    expect(dialog.getByText("Leave the line for Harbor Lights?")).toBeTruthy();
    expect(dialog.getByText("You lose your place.")).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Stay in line" })).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Leave the line" }));
    expect(await inLine.findByText("You left the line.")).toBeTruthy();

    inLine.unmount();
    const left = await renderGame();
    expect(
      row(left, "Alice’s copy").getByRole("button", { name: "Join the line" }),
    ).toBeTruthy();
  });
});
