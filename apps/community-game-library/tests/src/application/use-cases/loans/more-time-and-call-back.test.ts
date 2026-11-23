import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import {
  ChangedError,
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, sam, jo } = CAST.people;
const { youHaveMossAndMortar, joHasGullAndAnchor, joAskedForMossAndMortar } =
  CAST.loans;
// The kit's today, Tue Nov 10, 2026.
const TODAY = "2026-11-10";

describeEachBackend("more time, due dates and calling back (U14)", () => {
  let app: ReturnType<typeof makeApp>;
  const loanOf = async (id: string) =>
    (await app.repos.loans.getById(id)) ??
    Promise.reject(new Error(`No loan ${id}`));
  const told = async (userId: string) =>
    (await app.noticesOf(userId)).map((notice) => [
      notice.type,
      notice.loanId,
      notice.answerNote,
    ]);

  beforeEach(async () => {
    setSystemTime(new Date("2026-11-10T09:30:00-05:00"));
    app = makeApp();
    await app.makeCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("asks Sam for 1 more week on Moss & Mortar with a note, and tells Sam (C6)", async () => {
    await app.askMoreTime(
      youHaveMossAndMortar.id,
      { dueOn: "2026-11-20", note: "One more session to finish the campaign." },
      you.id,
      TODAY,
    );
    expect(await loanOf(youHaveMossAndMortar.id)).toMatchObject({
      dueOn: "2026-11-13",
      moreTimeDueOn: "2026-11-20",
      moreTimeNote: "One more session to finish the campaign.",
    });
    expect(await told(sam.id)).toEqual([
      ["more-time-asked", youHaveMossAndMortar.id, null],
    ]);
    // One request at a time.
    await expect(
      app.askMoreTime(
        youHaveMossAndMortar.id,
        { dueOn: "2026-11-21", note: null },
        you.id,
        TODAY,
      ),
    ).rejects.toThrow("You’ve asked already.");
  });

  it("refuses a date that isn't after the due date, the owner asking, and a loan called back", async () => {
    await expect(
      app.askMoreTime(
        youHaveMossAndMortar.id,
        { dueOn: "2026-11-13", note: null },
        you.id,
        TODAY,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    await expect(
      app.askMoreTime(
        youHaveMossAndMortar.id,
        { dueOn: "2026-11-20", note: null },
        sam.id,
        TODAY,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await app.callBack(youHaveMossAndMortar.id, sam.id, TODAY);
    await expect(
      app.askMoreTime(
        youHaveMossAndMortar.id,
        { dueOn: "2026-11-20", note: null },
        you.id,
        TODAY,
      ),
    ).rejects.toThrow("It’s been called back.");
  });

  it("says yes to Jo's date, which moves the due date and clears the request (C13)", async () => {
    await app.answerMoreTime(
      joHasGullAndAnchor.id,
      { answer: "yes", note: "Thursday's fine." },
      you.id,
      TODAY,
    );
    expect(await loanOf(joHasGullAndAnchor.id)).toMatchObject({
      dueOn: "2026-11-13",
      moreTimeDueOn: null,
      moreTimeNote: null,
      moreTimeAskedAt: null,
    });
    expect(await told(jo.id)).toEqual([
      ["more-time-answered", joHasGullAndAnchor.id, "Thursday's fine."],
    ]);
  });

  it("says yes for a date of your own, or no, which keeps the due date (C13)", async () => {
    await app.answerMoreTime(
      joHasGullAndAnchor.id,
      { answer: "no", note: "Ben's waiting." },
      you.id,
      TODAY,
    );
    expect(await loanOf(joHasGullAndAnchor.id)).toMatchObject({
      dueOn: "2026-11-09",
      moreTimeAskedAt: null,
    });
    await expect(
      app.answerMoreTime(
        joHasGullAndAnchor.id,
        { answer: "yes", note: null },
        you.id,
        TODAY,
      ),
    ).rejects.toBeInstanceOf(ChangedError);

    await app.askMoreTime(
      joHasGullAndAnchor.id,
      { dueOn: "2026-11-14", note: null },
      jo.id,
      TODAY,
    );
    await app.answerMoreTime(
      joHasGullAndAnchor.id,
      { answer: "yes", dueOn: "2026-11-12", note: null },
      you.id,
      TODAY,
    );
    expect((await loanOf(joHasGullAndAnchor.id)).dueOn).toBe("2026-11-12");
  });

  it("is only the owner's to answer, and a date of their own comes after today", async () => {
    await expect(
      app.answerMoreTime(
        joHasGullAndAnchor.id,
        { answer: "yes", note: null },
        jo.id,
        TODAY,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      app.answerMoreTime(
        joHasGullAndAnchor.id,
        { answer: "yes", dueOn: TODAY, note: null },
        you.id,
        TODAY,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
  });

  it("changes the due date from today on a loan that's overdue, and tells Jo (C14)", async () => {
    await expect(
      app.changeDueDate(joHasGullAndAnchor.id, TODAY, you.id, TODAY),
    ).rejects.toBeInstanceOf(InputParseError);
    await expect(
      app.changeDueDate(joHasGullAndAnchor.id, "2026-11-17", jo.id, TODAY),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await app.changeDueDate(joHasGullAndAnchor.id, "2026-11-17", you.id, TODAY);
    expect((await loanOf(joHasGullAndAnchor.id)).dueOn).toBe("2026-11-17");
    expect(await told(jo.id)).toEqual([
      ["due-date-changed", joHasGullAndAnchor.id, null],
    ]);
  });

  it("calls a game back: due today, the request for more time closed, and Jo told (C15)", async () => {
    await app.callBack(joHasGullAndAnchor.id, you.id, TODAY);
    const loan = await loanOf(joHasGullAndAnchor.id);
    // It was due Nov 9, so it stays due then, and overdue.
    expect(loan).toMatchObject({ dueOn: "2026-11-09", moreTimeAskedAt: null });
    expect(loan.calledBackAt).toBeInstanceOf(Date);
    expect(await told(jo.id)).toEqual([
      ["called-back", joHasGullAndAnchor.id, null],
    ]);
    // Twice changes nothing, and only the owner calls it back.
    await app.callBack(joHasGullAndAnchor.id, you.id, TODAY);
    expect(await told(jo.id)).toHaveLength(1);
    await expect(
      app.callBack(youHaveMossAndMortar.id, you.id, TODAY),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("brings a due date later than today to today", async () => {
    await app.callBack(youHaveMossAndMortar.id, sam.id, TODAY);
    expect((await loanOf(youHaveMossAndMortar.id)).dueOn).toBe(TODAY);
  });

  it("ends a pass-along: the giver's loan is out again and the next friend's yes goes back in line", async () => {
    await app.repos.transactions.startTransaction(async (tx) => {
      await app.repos.loans.update(
        youHaveMossAndMortar.id,
        { status: "passing", returnedOn: TODAY },
        tx,
      );
      await app.repos.loans.update(
        joAskedForMossAndMortar.id,
        {
          status: "accepted",
          previousLoanId: youHaveMossAndMortar.id,
          periodDays: 7,
        },
        tx,
      );
    });
    await app.callBack(youHaveMossAndMortar.id, sam.id, TODAY);
    expect(await loanOf(youHaveMossAndMortar.id)).toMatchObject({
      status: "out",
      returnedOn: null,
    });
    const jos = await app.repos.loans.getById(joAskedForMossAndMortar.id);
    expect(jos).toMatchObject({ status: "requested", previousLoanId: null });
  });
});
