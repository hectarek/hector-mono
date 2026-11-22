import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import {
  InputParseError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { isOverdue } from "@/src/entities/loan";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, sam, priya, jo } = CAST.people;
const { yourGullAndAnchor } = CAST.copies;
const {
  priyaAskedForNightMarket,
  joHasGullAndAnchor,
  youHaveMossAndMortar,
  benAskedForGullAndAnchor,
  joAskedForMossAndMortar,
} = CAST.loans;
// The kit's today, Tue Nov 10, 2026.
const TODAY = "2026-11-10";

describeEachBackend("the pick-up and the return (U13)", () => {
  let app: ReturnType<typeof makeApp>;
  const loanOf = async (id: string) =>
    (await app.getLoan(id, you.id, TODAY)).loan;
  const told = async (userId: string) =>
    (await app.noticesOf(userId)).map((notice) => [notice.type, notice.loanId]);
  const sayYes = (answer: { periodDays: 7 | 14 | 30 } | { dueOn: string }) =>
    app.answerRequest(
      priyaAskedForNightMarket.id,
      { answer: "yes", note: null, ...answer },
      you.id,
      TODAY,
    );

  beforeEach(async () => {
    // In the morning, so a yes is said today.
    setSystemTime(new Date("2026-11-10T09:30:00-05:00"));
    app = makeApp();
    await app.makeCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("starts the loan on the day picked up, a month being 30 days from it (R18, D5)", async () => {
    await sayYes({ periodDays: 30 });
    await app.confirmPickUp(
      priyaAskedForNightMarket.id,
      TODAY,
      priya.id,
      TODAY,
    );
    expect(await loanOf(priyaAskedForNightMarket.id)).toMatchObject({
      status: "out",
      pickedUpOn: TODAY,
      periodDays: 30,
      dueOn: "2026-12-10",
    });
  });

  it("keeps a picked date as the due date, and makes its days from the pick-up the period", async () => {
    await sayYes({ dueOn: "2026-11-20" });
    await app.confirmPickUp(
      priyaAskedForNightMarket.id,
      TODAY,
      priya.id,
      TODAY,
    );
    expect(await loanOf(priyaAskedForNightMarket.id)).toMatchObject({
      status: "out",
      periodDays: 10,
      dueOn: "2026-11-20",
    });
  });

  it("takes the owner's Priya has it, on an earlier day, and counts from that day", async () => {
    setSystemTime(new Date("2026-11-08T12:00:00-05:00"));
    await sayYes({ periodDays: 7 });
    setSystemTime(new Date("2026-11-10T09:30:00-05:00"));
    await app.confirmPickUp(
      priyaAskedForNightMarket.id,
      "2026-11-09",
      you.id,
      TODAY,
    );
    expect(await loanOf(priyaAskedForNightMarket.id)).toMatchObject({
      status: "out",
      pickedUpOn: "2026-11-09",
      dueOn: "2026-11-16",
    });
    // The borrower's confirmation afterwards changes nothing.
    await app.confirmPickUp(
      priyaAskedForNightMarket.id,
      TODAY,
      priya.id,
      TODAY,
    );
    expect((await loanOf(priyaAskedForNightMarket.id)).pickedUpOn).toBe(
      "2026-11-09",
    );
  });

  it("refuses a pick-up day after today or before the yes, and anyone but the two", async () => {
    await sayYes({ periodDays: 7 });
    for (const day of ["2026-11-11", "2026-11-09"]) {
      await expect(
        app.confirmPickUp(priyaAskedForNightMarket.id, day, priya.id, TODAY),
      ).rejects.toBeInstanceOf(InputParseError);
    }
    await expect(
      app.confirmPickUp(priyaAskedForNightMarket.id, TODAY, sam.id, TODAY),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses a pick-up after a date the owner picked", async () => {
    setSystemTime(new Date("2026-11-08T12:00:00-05:00"));
    await app.answerRequest(
      priyaAskedForNightMarket.id,
      { answer: "yes", dueOn: "2026-11-09", note: null },
      you.id,
      "2026-11-08",
    );
    setSystemTime(new Date("2026-11-10T09:30:00-05:00"));
    await expect(
      app.confirmPickUp(priyaAskedForNightMarket.id, TODAY, priya.id, TODAY),
    ).rejects.toBeInstanceOf(InputParseError);
    await app.confirmPickUp(
      priyaAskedForNightMarket.id,
      "2026-11-09",
      priya.id,
      TODAY,
    );
    expect(await loanOf(priyaAskedForNightMarket.id)).toMatchObject({
      status: "out",
      periodDays: 0,
      dueOn: "2026-11-09",
    });
  });

  it("takes Jo's I gave it back with the day, tells you, and stops it running overdue (R19, D15)", async () => {
    expect(isOverdue(await loanOf(joHasGullAndAnchor.id), TODAY)).toBe(true);
    await app.giveBack(joHasGullAndAnchor.id, "2026-11-09", jo.id, TODAY);
    const loan = await loanOf(joHasGullAndAnchor.id);
    expect(loan).toMatchObject({
      status: "returning",
      returnedOn: "2026-11-09",
    });
    expect(isOverdue(loan, TODAY)).toBe(false);
    expect(await told(you.id)).toContainEqual([
      "return-to-confirm",
      joHasGullAndAnchor.id,
    ]);
    const { needsYou, lent } = await app.listLoans(you.id, TODAY);
    expect(needsYou.map((item) => [item.why, item.game.title])).toContainEqual([
      "return",
      "Gull & Anchor",
    ]);
    expect(lent).toEqual([]);
  });

  it("is only the borrower's to give back, on a day from the pick-up to today", async () => {
    await expect(
      app.giveBack(joHasGullAndAnchor.id, TODAY, you.id, TODAY),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    for (const day of ["2026-11-11", "2026-11-01"]) {
      await expect(
        app.giveBack(joHasGullAndAnchor.id, day, jo.id, TODAY),
      ).rejects.toBeInstanceOf(InputParseError);
    }
  });

  it("closes it with Yes, it's back, adds what's new to the copy's note, and points to Ben, next in line", async () => {
    await app.giveBack(joHasGullAndAnchor.id, "2026-11-09", jo.id, TODAY);
    const { nextInLine } = await app.confirmReturn(
      joHasGullAndAnchor.id,
      { answer: "back", returnedOn: "2026-11-09", note: "The lid is torn." },
      you.id,
      TODAY,
    );
    expect(nextInLine).toBe(benAskedForGullAndAnchor.id);
    expect(await loanOf(joHasGullAndAnchor.id)).toMatchObject({
      status: "returned",
      returnedOn: "2026-11-09",
    });
    expect(
      (await app.repos.userGames.getById(yourGullAndAnchor.id))?.conditionNote,
    ).toBe("One blue anchor token is missing. The lid is torn.");
  });

  it("puts it back out with I don't have it yet, and tells Jo", async () => {
    await app.giveBack(joHasGullAndAnchor.id, "2026-11-09", jo.id, TODAY);
    await app.confirmReturn(
      joHasGullAndAnchor.id,
      { answer: "not-yet" },
      you.id,
      TODAY,
    );
    expect(await loanOf(joHasGullAndAnchor.id)).toMatchObject({
      status: "out",
      returnedOn: null,
    });
    expect(await told(jo.id)).toContainEqual([
      "return-not-confirmed",
      joHasGullAndAnchor.id,
    ]);
  });

  it("lets the owner mark a loan that's out as back without waiting, and only the owner", async () => {
    await expect(
      app.confirmReturn(
        youHaveMossAndMortar.id,
        { answer: "back", returnedOn: TODAY, note: null },
        you.id,
        TODAY,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    const { nextInLine } = await app.confirmReturn(
      youHaveMossAndMortar.id,
      { answer: "back", returnedOn: TODAY, note: null },
      sam.id,
      TODAY,
    );
    expect(nextInLine).toBe(joAskedForMossAndMortar.id);
    expect((await loanOf(youHaveMossAndMortar.id)).status).toBe("returned");
  });

  it("lists what you borrowed and lent on Loans, overdue first (R22)", async () => {
    const { borrowed, lent } = await app.listLoans(you.id, TODAY);
    expect(
      borrowed.map((item) => [
        item.game.title,
        item.other.name,
        item.next?.name,
      ]),
    ).toEqual([["Moss & Mortar", "Sam", "Jo"]]);
    expect(
      lent.map((item) => [item.game.title, item.other.name, item.next?.name]),
    ).toEqual([["Gull & Anchor", "Jo", "Ben"]]);

    await sayYes({ periodDays: 7 });
    await app.confirmPickUp(
      priyaAskedForNightMarket.id,
      TODAY,
      priya.id,
      TODAY,
    );
    expect(
      (await app.listLoans(you.id, TODAY)).lent.map((item) => item.game.title),
    ).toEqual(["Gull & Anchor", "Night Market"]);
  });
});
