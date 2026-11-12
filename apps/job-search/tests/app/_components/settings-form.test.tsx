import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { SettingsForm } from "@/app/_components/settings-form";
import { updateSettings } from "@/app/actions/settings";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

const current = () => getInjection("IGetSettingsController")({}, HECTOR);

const type = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } });

const submit = (view: ReturnType<typeof render>) => {
  const form = view.container.querySelector("form");
  if (!form) throw new Error("No form");
  fireEvent.submit(form);
};

describe("the settings form", () => {
  it("saves the targets and pay floor typed, blank as none, and says so", async () => {
    signInAs("owner");
    const view = render(
      <SettingsForm settings={await current()} humanOnly={false} />,
    );

    type(view.getByLabelText("Messages sent"), "15");
    type(view.getByLabelText("Applications"), "");
    type(view.getByLabelText("Pay floor"), "123456");
    submit(view);

    expect(await view.findByText("Saved.")).toBeTruthy();
    expect(await current()).toMatchObject({
      targets: { messagesSent: 15, applications: null },
      payFloor: 123_456,
    });
  });

  // R12 as revised 2026-11-10: the season Today tracks toward.
  it("saves the season's start, finish and checkpoints typed, leaving a blank row out", async () => {
    signInAs("owner");
    const view = render(
      <SettingsForm settings={await current()} humanOnly={false} />,
    );
    const checkpoint = (row: number) =>
      within(view.getByRole("group", { name: `Checkpoint ${row}` }));

    type(view.getByLabelText("Season start"), "2026-11-02");
    type(view.getByLabelText("Season finish"), "2027-02-01");
    type(checkpoint(1).getByLabelText("Date"), "2026-12-18");
    type(checkpoint(1).getByLabelText("Name"), "Five screens");
    type(checkpoint(3).getByLabelText("Date"), "2026-11-13");
    type(checkpoint(3).getByLabelText("Name"), "Portfolio live");
    submit(view);

    expect(await view.findByText("Saved.")).toBeTruthy();
    expect((await current()).season).toEqual({
      start: "2026-11-02",
      finish: "2027-02-01",
      checkpoints: [
        { on: "2026-11-13", name: "Portfolio live" },
        { on: "2026-12-18", name: "Five screens" },
      ],
    });
  });

  it("shows the checkpoints' check under them", async () => {
    signInAs("owner");
    const view = render(
      <SettingsForm settings={await current()} humanOnly={false} />,
    );

    type(view.getByLabelText("Season start"), "2026-11-02");
    type(view.getByLabelText("Season finish"), "2027-02-01");
    // Row 3, which the season saved above leaves blank: the test container keeps it for the run.
    type(
      within(view.getByRole("group", { name: "Checkpoint 3" })).getByLabelText(
        "Date",
      ),
      "2027-03-01",
    );
    submit(view);

    expect(
      await view.findAllByText("Checkpoint 3 needs a short name"),
    ).not.toHaveLength(0);
  });

  it("shows what it can't take under the field", async () => {
    signInAs("owner");
    const view = render(
      <SettingsForm settings={await current()} humanOnly={false} />,
    );

    type(view.getByLabelText("Pay floor"), "-1");
    submit(view);

    expect(await view.findAllByText("At least 0")).not.toHaveLength(0);
  });

  // R22, KTD15.
  it("on a conflict, shows the settings as they are now with the edits kept, and saves against them", async () => {
    signInAs("owner");
    const read = await current();
    const view = render(<SettingsForm settings={read} humanOnly={false} />);
    // Saved meanwhile, from another device.
    const other = await updateSettings({
      targets: { ...read.targets, practiceSessions: 9 },
      payFloor: read.payFloor,
      seasonStart: read.season?.start ?? null,
      seasonFinish: read.season?.finish ?? null,
      checkpoints: read.season?.checkpoints ?? [],
      updatedAt: read.updatedAt?.toISOString() ?? null,
    });
    if (!other.ok) throw new Error(`The other save failed: ${other.code}`);

    type(view.getByLabelText("Conversations held"), "4");
    submit(view);

    expect(await view.findByText("Practice sessions is now 9")).toBeTruthy();
    expect(view.getByLabelText("Practice sessions")).toHaveProperty(
      "value",
      "9",
    );

    submit(view);
    await waitFor(async () =>
      expect((await current()).targets).toMatchObject({
        conversationsHeld: 4,
        practiceSessions: 9,
      }),
    );
  });

  // R21, KTD3: Claude's session sees the settings, with the form off.
  it("is off for Claude's session, saying only Hector changes it", async () => {
    signInAs("agent");
    const view = render(<SettingsForm settings={await current()} humanOnly />);

    expect(view.getByLabelText("Pay floor")).toHaveProperty("disabled", true);
    expect(
      view.getByRole("button", { name: "Save" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(view.getByText("Only Hector")).toBeTruthy();
  });
});
