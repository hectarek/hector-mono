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
import type { ReactNode } from "react";

// The host the request came to; headers() works only inside a request.
mock.module("next/headers", () => ({
  headers: async () => new Headers({ host: "communitygamelibrary.com" }),
}));

const { APP_TOASTER } = await import("@/app/_lib/notify");
const { default: NightPage } = await import("@/app/(main)/nights/[id]/page");
const { default: NightsPage } = await import("@/app/(main)/nights/page");
const { default: PastNightsPage } = await import(
  "@/app/(main)/nights/past/page"
);
const { GET: calendarOf } = await import(
  "@/app/(main)/nights/[id]/calendar/route"
);
const { getInjection } = await import("@/di/container");
const { CAST } = await import("@/tests/_support/cast");
const { resetCastNights, signInAsYouWithTheCast } = await import(
  "@/tests/_support/members"
);
const { nextState } = await import("@/tests/_support/next");

const { heavyGamesAtMine, saturdayGameNight, halloweenOneShots } = CAST.nights;
const { you, alice, mei } = CAST.people;
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function renderPage(page: Promise<ReactNode>) {
  const view = render(
    <>
      {await page}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
  return { view, page: within(view.container) };
}

// D12's rows, under the way back to Nights.
const rowsOf = (page: ReturnType<typeof within>) =>
  within(page.getByRole("list"))
    .getAllByRole("link")
    .map((row) => row.textContent);

describe("Cancelling, past nights and the calendar file (U21: D11, D12, D15)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
    resetCastNights();
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  it("cancels Heavy games at mine after D11's dialog, then opens Nights with Text them too (D15)", async () => {
    const { view, page } = await renderPage(
      NightPage(params(heavyGamesAtMine.id)),
    );
    expect(
      page.getByText("Everyone going, invited or waiting is told."),
    ).toBeTruthy();
    fireEvent.click(page.getByRole("button", { name: "Cancel the night" }));
    const dialog = within(await view.findByRole("alertdialog"));
    expect(dialog.getByText("Cancel Heavy games at mine?")).toBeTruthy();
    expect(
      dialog.getByText(
        "Fri, Nov 20 · 7:00 PM. Everyone going, invited or waiting is told: Sam, Priya, Jo, Ben and Dev.",
      ),
    ).toBeTruthy();
    expect(
      dialog.getByText(
        "It goes to their inbox. They see it when they next open the app.",
      ),
    ).toBeTruthy();
    expect(dialog.getByText("This can’t be undone.")).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Keep it" })).toBeTruthy();

    fireEvent.change(dialog.getByLabelText(/Note for them/), {
      target: { value: "Water leak, sorry." },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Cancel the night" }));
    expect(
      await view.findByText("Heavy games at mine is cancelled"),
    ).toBeTruthy();
    expect(view.getByRole("button", { name: "Text them too" })).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toEqual(["/nights"]));

    const night = await getInjection("IGameNightsRepository").getById(
      heavyGamesAtMine.id,
    );
    expect(night?.cancelledAt).not.toBeNull();
    const notices = await getInjection("INoticesRepository").listForUser(
      CAST.people.dev.id,
    );
    expect(
      notices
        .filter((one) => one.type === "night-cancelled")
        .map((one) => one.answerNote),
    ).toEqual(["Water leak, sorry."]);
  });

  it("shows a cancelled night as it was: Cancelled, who was going, and nothing to change", async () => {
    await getInjection("ICancelNightController")(
      { gameNightId: heavyGamesAtMine.id, note: "" },
      you.id,
    );
    const { page } = await renderPage(NightPage(params(heavyGamesAtMine.id)));
    expect(page.getByText("Cancelled")).toBeTruthy();
    expect(page.getByText("6 were going")).toBeTruthy();
    for (const gone of [
      "Cancel the night",
      "Invite people",
      "Add to my calendar",
      "Make a new link",
      "Remove from waitlist",
      "I’d play",
    ]) {
      expect(page.queryByRole("button", { name: gone }) === null).toBe(true);
    }
  });

  it("lists past nights on D12, newest first, the cancelled one stamped, with their count on Nights (D1)", async () => {
    const nights = (await renderPage(NightsPage())).page;
    const past = nights.getByRole("link", { name: /Past game nights/ });
    expect(past.getAttribute("href")).toBe("/nights/past");
    expect(past.textContent).toBe("Past game nights2");

    await getInjection("ICancelNightController")(
      { gameNightId: heavyGamesAtMine.id, note: "" },
      you.id,
    );
    const { page } = await renderPage(PastNightsPage());
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Past game nights",
    );
    expect(rowsOf(page)).toEqual([
      "Heavy games at mineFri, Nov 20You were hostingCancelled",
      "Halloween one-shotsSat, Oct 31Jo hosted · 5 came · 3 games",
      "September game nightSat, Sep 19Sam hosted · 4 came · 2 games",
    ]);
    expect(
      page
        .getByRole("link", { name: /Halloween one-shots/ })
        .getAttribute("href"),
    ).toBe(`/nights/${halloweenOneShots.id}`);
  });

  it("says No past game nights. when there are none", async () => {
    nextState.userId = mei.id;
    const { page } = await renderPage(PastNightsPage());
    expect(page.getByText("No past game nights.")).toBeTruthy();
  });

  it("shows a past night as it was: who came and its table, with nothing to answer", async () => {
    const { page } = await renderPage(NightPage(params(halloweenOneShots.id)));
    expect(page.getByText("5 came")).toBeTruthy();
    expect(page.getByText("Salt & Signal")).toBeTruthy();
    for (const gone of [
      "I’m going",
      "Change answer or guests",
      "I’d play",
      "You’d play",
      "I’ll bring a game",
      "What should we play?",
      "Add to my calendar",
    ]) {
      expect(page.queryByRole("button", { name: gone }) === null).toBe(true);
    }
    expect(page.queryByText("Answer to say what you’d play.") === null).toBe(
      true,
    );
  });

  it("offers Add to my calendar to the host (D7) and to someone going (D13)", async () => {
    const host = (await renderPage(NightPage(params(heavyGamesAtMine.id))))
      .page;
    expect(
      host
        .getByRole("button", { name: "Add to my calendar" })
        .getAttribute("href"),
    ).toBe(`/nights/${heavyGamesAtMine.id}/calendar`);

    await getInjection("IAnswerNightController")(
      { gameNightId: saturdayGameNight.id, answer: "going" },
      you.id,
    );
    const going = (await renderPage(NightPage(params(saturdayGameNight.id))))
      .page;
    expect(
      going
        .getByRole("button", { name: "Add to my calendar" })
        .getAttribute("href"),
    ).toBe(`/nights/${saturdayGameNight.id}/calendar`);
  });

  it("downloads the calendar file only for someone who can see the night (KTD24)", async () => {
    const request = new Request(
      `http://localhost:3102/nights/${heavyGamesAtMine.id}/calendar`,
    );
    const response = await calendarOf(request, params(heavyGamesAtMine.id));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="heavy-games-at-mine.ics"',
    );
    const text = await response.text();
    expect(text).toContain("SUMMARY:Heavy games at mine\r\n");
    expect(text).toContain("DTSTART:20261121T000000Z\r\n");
    expect(text).toContain(
      `URL:http://localhost:3102/nights/${heavyGamesAtMine.id}\r\n`,
    );

    nextState.userId = alice.id;
    const refused = await calendarOf(request, params(heavyGamesAtMine.id));
    expect(refused.status).toBe(404);
    expect((await calendarOf(request, params("not-a-night"))).status).toBe(404);
  });
});
