import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import SettingsPage from "@/app/(main)/settings/page";
import { addSource } from "@/app/actions/sources";
import { Redirected } from "@/tests/_support/next";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const settingsPage = async () =>
  within(await renderOnServer(await SettingsPage()));

describe("the settings page", () => {
  it("shows Hector the targets and pay floor to change, and the lead sources", async () => {
    signInAs("owner");
    const name = `Gadget Board ${crypto.randomUUID().slice(0, 8)}`;
    await addSource({ name });

    const page = await settingsPage();

    const targets = within(
      page.getByRole("region", { name: "Targets and pay" }),
    );
    for (const label of [
      "Messages sent",
      "Conversations held",
      "Applications",
      "Practice sessions",
      "Moves to screen or beyond",
      "Pay floor",
    ]) {
      expect(targets.getByLabelText<HTMLInputElement>(label).disabled).toBe(
        false,
      );
    }
    const sources = within(page.getByRole("region", { name: "Lead sources" }));
    expect(sources.getByText(name)).toBeTruthy();
    expect(sources.getByLabelText("New source's name")).toBeTruthy();
    expect(page.getByRole("region", { name: "History" })).toBeTruthy();
  });

  // R21, KTD3: settings are Hector's alone, and Claude's session sees them off.
  it("shows Claude's session the settings off, as only Hector's, and lets it add a source", async () => {
    signInAs("agent");
    const page = await settingsPage();

    const targets = within(
      page.getByRole("region", { name: "Targets and pay" }),
    );
    expect(targets.getByLabelText<HTMLInputElement>("Pay floor").disabled).toBe(
      true,
    );
    expect(targets.getByText("Only Hector")).toBeTruthy();
    const sources = within(page.getByRole("region", { name: "Lead sources" }));
    expect(
      sources.getByLabelText<HTMLInputElement>("New source's name").disabled,
    ).toBe(false);
  });

  it("sends an account that isn't one of the app's two to the private screen", async () => {
    signInAs("stranger");
    const outcome = await SettingsPage().catch((err: unknown) => err);
    expect(outcome).toBeInstanceOf(Redirected);
    expect((outcome as Redirected).url).toBe("/private");
  });
});
