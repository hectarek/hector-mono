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
import { APP_TOASTER } from "@/app/_lib/notify";
import EditNightPage from "@/app/(main)/nights/[id]/edit/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { NotFoundPage, nextState } from "@/tests/_support/next";

const { heavyGamesAtMine, saturdayGameNight } = CAST.nights;
const editPage = (id: string) =>
  EditNightPage({ params: Promise.resolve({ id }) });

describe("Edit a night (U18: R34)", () => {
  beforeEach(() => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  it("moves the start, names everyone going who's told, and goes back to the night", async () => {
    await signInAsYouWithTheCast();
    const view = render(
      <>
        {await editPage(heavyGamesAtMine.id)}
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    const page = within(view.container);
    const name = page.getByRole("textbox", {
      name: "Name",
    }) as HTMLInputElement;
    expect(name.value).toBe("Heavy games at mine");
    const starts = page.getByRole("combobox", {
      name: "Starts",
    }) as HTMLSelectElement;
    expect(starts.value).toBe("19:00");
    expect(
      (page.getByRole("combobox", { name: /^Ends/ }) as HTMLSelectElement)
        .value,
    ).toBe("22:30");
    fireEvent.change(starts, { target: { value: "18:30" } });
    fireEvent.submit(
      page
        .getByRole("button", { name: "Save changes" })
        .closest("form") as HTMLFormElement,
    );
    expect(
      await view.findByText("Saved. Sam, Priya, Jo and Ben are told."),
    ).toBeTruthy();
    await waitFor(() =>
      expect(nextState.pushed).toEqual([`/nights/${heavyGamesAtMine.id}`]),
    );
    const night = await getInjection("IGameNightsRepository").getById(
      heavyGamesAtMine.id,
    );
    expect(night?.startsAt).toEqual(new Date("2026-11-20T18:30:00-05:00"));
    expect(night?.guestsAllowed).toBe(true);
  });

  it("saves a switch as it's flipped (rule 4)", async () => {
    await signInAsYouWithTheCast();
    const view = render(
      <>
        {await editPage(heavyGamesAtMine.id)}
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    fireEvent.click(
      within(view.container).getByRole("switch", {
        name: "People going can invite others",
      }),
    );
    expect(await view.findByText("Saved.")).toBeTruthy();
    const night = await getInjection("IGameNightsRepository").getById(
      heavyGamesAtMine.id,
    );
    expect(night?.attendeesCanInvite).toBe(true);
  });

  it("is Not found to anyone but the host", async () => {
    await signInAsYouWithTheCast();
    await expect(editPage(saturdayGameNight.id)).rejects.toThrow(NotFoundPage);
  });
});
