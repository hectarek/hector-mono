import { describe, expect, it } from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, within } from "@testing-library/react";
import { APP_TOASTER } from "@/app/_lib/notify";
import NoticesPage from "@/app/(main)/you/notices/page";
import { getInjection } from "@/di/container";
import { signInAsMember } from "@/tests/_support/members";

// A Base UI switch's name comes from the label it's labelled by (AGENTS.md, Testing).
const nameOf = (control: HTMLElement) =>
  (control.getAttribute("aria-labelledby") ?? "")
    .split(" ")
    .map((id) => control.ownerDocument.getElementById(id)?.textContent)
    .join(" ")
    .trim();

describe("Notices I get (E7)", () => {
  it("draws E7's thirteen switches in its order, the morning reminder off, and saves a flip", async () => {
    const userId = await signInAsMember();
    const view = render(
      <>
        {await NoticesPage()}
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    const page = within(view.container);
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Notices I get",
    );
    for (const panel of [
      "Loans",
      "Friends",
      "Game nights",
      "Games you suggested",
    ]) {
      expect(page.getByText(panel)).toBeTruthy();
    }
    const switches = page.getAllByRole("switch");
    expect(
      switches.map((one) => [nameOf(one), one.getAttribute("aria-checked")]),
    ).toEqual([
      ["Due-date reminders", "true"],
      ["Overdue reminders", "true"],
      ["Requests on my games", "true"],
      ["Answers to my requests", "true"],
      ["The line", "true"],
      ["A pick-up or a return to confirm", "true"],
      ["More-time requests", "true"],
      ["Friend requests", "true"],
      ["Invites", "true"],
      ["Changes and cancellations", "true"],
      ["A seat opening for me on a waitlist", "true"],
      ["A reminder the morning of a game night", "false"],
      ["What happened to my suggestion", "true"],
    ]);
    expect(page.getByText("Saved as you switch.")).toBeTruthy();

    const invites = switches.find((one) => nameOf(one) === "Invites");
    fireEvent.click(invites as HTMLElement);
    expect(await view.findByText("Saved.")).toBeTruthy();
    expect(await getInjection("IGetNoticeSettingsController")(userId)).toEqual([
      "night-invites",
      "night-mornings",
    ]);
  });
});
