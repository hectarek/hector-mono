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
const { default: NightPage } = await import("@/app/(main)/nights/[id]/page");
const { default: InvitePage } = await import(
  "@/app/(main)/nights/[id]/invite/page"
);
const { getInjection } = await import("@/di/container");
const { CAST } = await import("@/tests/_support/cast");
const { resetCastNights, signInAsYouWithTheCast } = await import(
  "@/tests/_support/members"
);
const { NotFoundPage, nextState } = await import("@/tests/_support/next");
const { nightLinkMessage } = await import("@/src/entities/share-message");

const { saturdayGameNight, heavyGamesAtMine, bensBirthdayGames } = CAST.nights;
const { you, jo, ben, mei, sam } = CAST.people;

async function renderNight(id: string) {
  const view = render(
    <>
      {await NightPage({ params: Promise.resolve({ id }) })}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
  return { view, page: within(view.container) };
}

const statusOf = async (nightId: string, userId: string) =>
  (await getInjection("IGameNightsRepository").getAttendee(nightId, userId))
    ?.status ?? null;

describe("Invites, answers, the waitlist and guests (U19: D2, D3, D4, D7, D10, D13)", () => {
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

  it("answers D2 with I'm going, which shows D13's Going and You + 0 guests (Answer a game night)", async () => {
    const { view, page } = await renderNight(saturdayGameNight.id);
    expect(
      page.getByText(
        "Bringing someone? Answer first, then add your guests. Only Alice invites people.",
      ),
    ).toBeTruthy();
    expect(page.getByText("Answer to say what you’d play.")).toBeTruthy();
    fireEvent.click(page.getByRole("button", { name: "I’m going" }));
    expect(await view.findByText("You’re going.")).toBeTruthy();
    expect(await statusOf(saturdayGameNight.id, you.id)).toBe("going");
    view.unmount();

    const again = (await renderNight(saturdayGameNight.id)).page;
    expect(again.getByText("You + 0 guests")).toBeTruthy();
    expect(again.getByText("Alice, Sam, Jo, Priya and you")).toBeTruthy();
    expect(
      again.getByRole("button", { name: "Change answer or guests" }),
    ).toBeTruthy();
    expect(again.getAllByRole("button", { name: "I’d play" }).length).toBe(4);
  });

  // U26's stamp press: the answer's page comes back from the server where it is, Going arrives,
  // and it presses; a night already answered shows it still.
  it("presses Going as the answer comes back, not on a night already answered", async () => {
    const { view, page } = await renderNight(saturdayGameNight.id);
    fireEvent.click(page.getByRole("button", { name: "I’m going" }));
    await waitFor(async () =>
      expect(await statusOf(saturdayGameNight.id, you.id)).toBe("going"),
    );
    view.rerender(
      <>
        {
          await NightPage({
            params: Promise.resolve({ id: saturdayGameNight.id }),
          })
        }
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    const going = () =>
      page
        .getByText("You + 0 guests")
        .querySelector<HTMLElement>("[data-tone]");
    expect(going()?.textContent).toBe("Going");
    expect(going()?.dataset.moment).toBe("press");
    view.unmount();

    const again = (await renderNight(saturdayGameNight.id)).page;
    expect(
      again
        .getByText("You + 0 guests")
        .querySelector<HTMLElement>("[data-tone]")?.dataset.moment,
    ).toBeUndefined();
  });

  it("brings a guest on D3 who doesn't fit, and joins the waitlist for 2 seats (AE4)", async () => {
    // Five going with you, one seat left.
    await getInjection("IAnswerNightController")(
      { gameNightId: saturdayGameNight.id, answer: "going" },
      you.id,
    );
    nextState.userId = ben.id;
    const { view, page } = await renderNight(saturdayGameNight.id);
    fireEvent.click(page.getByRole("button", { name: "Maybe" }));
    expect(await view.findByText("You said maybe.")).toBeTruthy();
    view.unmount();

    // Ben, now maybe, opens D3 from his page by answering going with a guest.
    nextState.userId = ben.id;
    await getInjection("IAnswerNightController")(
      { gameNightId: saturdayGameNight.id, answer: "waitlisted", guests: 1 },
      ben.id,
    );
    expect(await statusOf(saturdayGameNight.id, ben.id)).toBe("waitlisted");
    const waiting = (await renderNight(saturdayGameNight.id)).page;
    expect(waiting.getByText("Waitlist · you’re 1st")).toBeTruthy();
    expect(
      waiting.getByRole("button", { name: "Leave the waitlist" }),
    ).toBeTruthy();
  });

  it("offers Go alone or Join the waitlist on D3 when the guests don't fit", async () => {
    nextState.userId = jo.id;
    // Jo is going to Alice's night, with 2 seats open: Jo can bring 2 guests.
    const { view } = await renderNight(saturdayGameNight.id);
    fireEvent.click(
      view.getByRole("button", { name: "Change answer or guests" }),
    );
    const sheet = within(await view.findByRole("dialog"));
    expect(
      sheet.getByText(
        "Each guest takes a seat. 2 seats are open, so you can bring 2 guests.",
      ),
    ).toBeTruthy();
    fireEvent.click(sheet.getByRole("button", { name: "One guest more" }));
    fireEvent.click(sheet.getByRole("button", { name: "Save" }));
    expect(await view.findByText("You’re going, with 1 guest.")).toBeTruthy();
  });

  it("shows D4 on a full night, and joins its waitlist (Join a waitlist)", async () => {
    const { view, page } = await renderNight(bensBirthdayGames.id);
    expect(page.getByText("Full")).toBeTruthy();
    expect(page.getByText("8 of 8 going")).toBeTruthy();
    expect(
      page.getByText("Ben, Alice, Sam, Priya, Jo, Mei, Dev and Dev’s guest"),
    ).toBeTruthy();
    expect(
      page.getByText("Nobody is waiting yet.", { exact: false }),
    ).toBeTruthy();
    fireEvent.click(page.getByRole("button", { name: "Join the waitlist" }));
    expect(await view.findByText("You’re 1st on the waitlist.")).toBeTruthy();
    expect(await statusOf(bensBirthdayGames.id, you.id)).toBe("waitlisted");
  });

  it("says when the last seat went while D2 was open, and joins the waitlist from there", async () => {
    const { view, page } = await renderNight(saturdayGameNight.id);
    // Meanwhile Ben takes a seat with a guest: none left.
    await getInjection("IAnswerNightController")(
      { gameNightId: saturdayGameNight.id, answer: "going", guests: 1 },
      ben.id,
    );
    fireEvent.click(page.getByRole("button", { name: "I’m going" }));
    expect(await view.findByText("The last seat was just taken.")).toBeTruthy();
    fireEvent.click(page.getByRole("button", { name: "Join the waitlist" }));
    expect(await view.findByText("You’re 1st on the waitlist.")).toBeTruthy();
  });

  it("takes Dev off the waitlist after the dialog, and he's told (Actions that ask first)", async () => {
    const { view, page } = await renderNight(heavyGamesAtMine.id);
    fireEvent.click(page.getByRole("button", { name: "Remove from waitlist" }));
    const dialog = within(await view.findByRole("alertdialog"));
    expect(dialog.getByText("Take Dev off the waitlist?")).toBeTruthy();
    expect(dialog.getByText("Dev is told.")).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Remove Dev" }));
    expect(
      await view.findByText("Dev is off the waitlist. Dev is told."),
    ).toBeTruthy();
    expect(await statusOf(heavyGamesAtMine.id, CAST.people.dev.id)).toBe(
      "cant-go",
    );
  });

  it("makes a new link after the dialog, which ends the old one", async () => {
    const { view, page } = await renderNight(heavyGamesAtMine.id);
    fireEvent.click(page.getByRole("button", { name: "Make a new link" }));
    const dialog = within(await view.findByRole("alertdialog"));
    expect(
      dialog.getByText("The link you already shared stops working."),
    ).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Make a new link" }));
    expect(
      await view.findByText("New link made. The old one stops working."),
    ).toBeTruthy();
    const night = await getInjection("IGameNightsRepository").getById(
      heavyGamesAtMine.id,
    );
    expect(night?.linkToken).not.toBe("7QK2-MARR");
  });

  // Every link offers Share and Copy as E2 does (Hector, 2026-11-25). The browser here has no
  // share sheet, so Share copies the ready message with the link; Copy copies the link alone.
  it("offers Share and Copy for the night's link, on the host's page (D7) and on Invite people (D10)", async () => {
    const copied: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          copied.push(text);
        },
      },
    });
    const url = "https://communitygamelibrary.com/n/7QK2-MARR";
    const message = `${nightLinkMessage("Heavy games at mine")} ${url}`;
    // A button's kind, by its variant's class: Button's variant carries no data attribute. The
    // link's two are secondary, since each page has its own main action (rule 2).
    const kinds = (buttons: HTMLElement[]) =>
      buttons.map((button) => [
        button.textContent,
        button.classList.contains("bg-primary")
          ? "filled"
          : button.classList.contains("bg-secondary")
            ? "secondary"
            : "another kind",
      ]);

    const { view, page } = await renderNight(heavyGamesAtMine.id);
    const nightsLink = within(
      page.getByText("The night’s link").parentElement as HTMLElement,
    );
    expect(kinds(nightsLink.getAllByRole("button"))).toEqual([
      ["Share", "secondary"],
      ["Copy", "secondary"],
      ["Make a new link", "another kind"],
    ]);
    expect(
      kinds([page.getByRole("button", { name: "Invite people" })]),
    ).toEqual([["Invite people", "filled"]]);
    fireEvent.click(nightsLink.getByRole("button", { name: "Copy" }));
    expect(await view.findByText("Link copied")).toBeTruthy();
    expect(copied).toEqual([url]);
    fireEvent.click(nightsLink.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(copied).toEqual([url, message]));
    view.unmount();

    const invite = render(
      await InvitePage({
        params: Promise.resolve({ id: heavyGamesAtMine.id }),
      }),
    );
    const orShare = within(
      within(invite.container)
        .getByText("Or share the link")
        .closest("section") as HTMLElement,
    );
    expect(kinds(orShare.getAllByRole("button"))).toEqual([
      ["Share", "secondary"],
      ["Copy", "secondary"],
    ]);
    expect(
      kinds([
        within(invite.container).getByRole("button", { name: "Send invites" }),
      ]),
    ).toEqual([["Send invites", "filled"]]);
    fireEvent.click(orShare.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(copied).toEqual([url, message, url]));
    fireEvent.click(orShare.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(copied).toEqual([url, message, url, message]));
  });

  it("invites Alice from D10, who joins the waitlist after Dev, then goes back to the night (Send invitations)", async () => {
    const view = render(
      <>
        {
          await InvitePage({
            params: Promise.resolve({ id: heavyGamesAtMine.id }),
          })
        }
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    const page = within(view.container);
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Invite people",
    );
    const already = within(
      page.getByText("Already invited").closest("section") as HTMLElement,
    );
    expect(
      already.getAllByRole("listitem").map((row) => row.textContent),
    ).toEqual([
      "SamGoing",
      "PriyaGoing",
      "JoGoing",
      "BenBringing 1 guestGoing",
    ]);
    // Switched off, with no count, until someone's ticked.
    expect(
      page
        .getByRole("button", { name: "Send invites" })
        .hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.click(page.getByText("Alice"));
    expect(
      await page.findByText(
        "The night is full, so Alice joins the waitlist after Dev.",
      ),
    ).toBeTruthy();
    fireEvent.click(page.getByRole("button", { name: "Send 1 invite" }));
    expect(await view.findByText("Alice is invited and told.")).toBeTruthy();
    await waitFor(() =>
      expect(nextState.pushed).toEqual([`/nights/${heavyGamesAtMine.id}`]),
    );
    expect(await statusOf(heavyGamesAtMine.id, CAST.people.alice.id)).toBe(
      "invited",
    );
  });

  it("is Not found on Invite people for someone who may not invite", async () => {
    nextState.userId = sam.id;
    await expect(
      InvitePage({ params: Promise.resolve({ id: heavyGamesAtMine.id }) }),
    ).rejects.toThrow(NotFoundPage);
  });

  it("says nobody's invited yet on a new night, with Invite people, and no games on its table", async () => {
    const night = await getInjection("ICreateNightController")(
      {
        name: "Quiet night in",
        date: "2026-11-27",
        startsAt: "19:00",
        endsAt: null,
        place: "Robin’s place",
        address: "",
        note: "",
        capacity: 4,
        audience: "invited",
        attendeesCanInvite: false,
        guestsAllowed: false,
        userGameIds: [],
      },
      you.id,
    );
    const { page } = await renderNight(night.id);
    expect(page.getByText("Nobody’s invited yet.")).toBeTruthy();
    expect(page.getByText("No games on the table yet.")).toBeTruthy();
    expect(
      page.getByText(`communitygamelibrary.com/n/${night.linkToken}`),
    ).toBeTruthy();
    expect(mei.id).toBeTruthy();
  });
});
