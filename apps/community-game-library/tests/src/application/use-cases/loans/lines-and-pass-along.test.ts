import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import {
  ChangedError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { copyState, isOverdue, lineOf } from "@/src/entities/loan";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, sam, alice, priya, jo, ben, mei, noor } = CAST.people;
const { alicesHarborLights, samsHarborLights, yourNightMarket } = CAST.copies;
const {
  joAskedForAlicesHarborLights,
  youHaveMossAndMortar,
  joAskedForMossAndMortar,
  priyaAskedForNightMarket,
  joHasGullAndAnchor,
  benAskedForGullAndAnchor,
} = CAST.loans;
// The kit's today, Tue Nov 10, 2026.
const TODAY = "2026-11-10";

describeEachBackend("lines and passing it along (U15)", () => {
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
  const copyOf = async (id: string) =>
    (await app.repos.userGames.getById(id)) ??
    Promise.reject(new Error(`No copy ${id}`));
  const lineFor = async (copyId: string) =>
    lineOf(await app.repos.loans.listOpenForCopies([copyId])).map(
      (loan) => loan.borrowerUserId,
    );
  const join = (
    userGameId: string,
    userId: string,
    note: string | null = null,
  ) => app.requestLoan({ userGameId, note, join: true }, userId);

  beforeEach(async () => {
    setSystemTime(new Date("2026-11-10T09:30:00-05:00"));
    app = makeApp();
    await app.makeCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  describe("joining and leaving a line (R24, C10)", () => {
    it("joins Alice's Harbor Lights behind Jo while Ben has it, with a note, and tells Alice", async () => {
      const loan = await join(alicesHarborLights.id, you.id, "No rush.");
      expect(loan).toMatchObject({
        status: "requested",
        requestNote: "No rush.",
      });
      expect(await lineFor(alicesHarborLights.id)).toEqual([jo.id, you.id]);
      expect(await told(alice.id)).toEqual([["line-joined", loan.id, null]]);
      const state = copyState(
        await copyOf(alicesHarborLights.id),
        await app.repos.loans.listOpenForCopies([alicesHarborLights.id]),
        you.id,
        TODAY,
      );
      expect(state).toMatchObject({
        kind: "in-line",
        stamp: { word: "2nd in line" },
      });
      // Ask to borrow on a copy that's out is Changed underneath, with joining as its next step.
      await expect(
        app.requestLoan(
          { userGameId: alicesHarborLights.id, note: null },
          priya.id,
        ),
      ).rejects.toBeInstanceOf(ChangedError);
    });

    it("keeps the order people asked in, and only the owner's friends join", async () => {
      await join(alicesHarborLights.id, you.id);
      setSystemTime(new Date("2026-11-10T09:45:00-05:00"));
      await join(alicesHarborLights.id, mei.id);
      expect(await lineFor(alicesHarborLights.id)).toEqual([
        jo.id,
        you.id,
        mei.id,
      ]);
      // Noor is Sam's friend, not Alice's: Alice's copy isn't there for Noor.
      await expect(join(alicesHarborLights.id, noor.id)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("leaves the line: the owner isn't told, and whoever moves up to first is", async () => {
      const yours = await join(alicesHarborLights.id, you.id);
      await app.withdrawRequest(joAskedForAlicesHarborLights.id, jo.id);
      expect(await told(you.id)).toEqual([["turn-in-line", yours.id, null]]);
      expect(await told(alice.id)).toEqual([["line-joined", yours.id, null]]);
      await app.withdrawRequest(yours.id, you.id);
      expect(await lineFor(alicesHarborLights.id)).toEqual([]);
      expect(await told(alice.id)).toHaveLength(1);
    });

    it("takes Ben out of the line with a note, which Ben is told, and Priya, behind him, is first now", async () => {
      const priyas = await join(CAST.copies.yourGullAndAnchor.id, priya.id);
      await app.answerRequest(
        benAskedForGullAndAnchor.id,
        { answer: "no", note: "Jo needs it a while longer." },
        you.id,
        TODAY,
      );
      expect(await loanOf(benAskedForGullAndAnchor.id)).toMatchObject({
        status: "declined",
      });
      expect(await told(ben.id)).toEqual([
        [
          "request-declined",
          benAskedForGullAndAnchor.id,
          "Jo needs it a while longer.",
        ],
      ]);
      expect(await told(priya.id)).toEqual([["turn-in-line", priyas.id, null]]);
    });

    it("tells whoever is behind a request said yes to, or no to, that they're first now", async () => {
      const bens = await join(yourNightMarket.id, ben.id);
      await app.answerRequest(
        priyaAskedForNightMarket.id,
        { answer: "yes", periodDays: 14, note: null },
        you.id,
        TODAY,
      );
      expect(await told(ben.id)).toEqual([["turn-in-line", bens.id, null]]);
      await app.answerRequest(
        bens.id,
        { answer: "no", note: null },
        you.id,
        TODAY,
      );
      expect(await told(ben.id)).toHaveLength(2);
    });
  });

  describe("passing it along (R48)", () => {
    it("AE9: on a two-week loan, the next friend confirms on day 10, the first loan ends, the new one is due two weeks on, and Sam is told", async () => {
      setSystemTime(new Date("2026-11-02T09:00:00-05:00"));
      const mine = await app.requestLoan(
        { userGameId: samsHarborLights.id, note: null },
        you.id,
      );
      await app.answerRequest(
        mine.id,
        { answer: "yes", periodDays: 14, note: null },
        sam.id,
        "2026-11-02",
      );
      await app.confirmPickUp(mine.id, "2026-11-02", you.id, "2026-11-02");
      const jos = await join(samsHarborLights.id, jo.id);

      setSystemTime(new Date("2026-11-12T18:00:00-05:00"));
      await app.passAlong(mine.id, you.id);
      expect(await loanOf(mine.id)).toMatchObject({ status: "passing" });
      expect(await loanOf(jos.id)).toMatchObject({
        status: "accepted",
        previousLoanId: mine.id,
        periodDays: 14,
      });
      expect(await told(jo.id)).toEqual([
        ["pass-along-to-confirm", jos.id, null],
      ]);

      await app.confirmPassAlong(jos.id, "2026-11-12", jo.id, "2026-11-12");
      expect(await loanOf(mine.id)).toMatchObject({
        status: "passed-along",
        returnedOn: "2026-11-12",
      });
      expect(await loanOf(jos.id)).toMatchObject({
        status: "out",
        pickedUpOn: "2026-11-12",
        dueOn: "2026-11-26",
      });
      expect((await told(sam.id)).at(-1)).toEqual([
        "passed-along",
        jos.id,
        null,
      ]);
      // Confirming twice changes nothing.
      await app.confirmPassAlong(jos.id, "2026-11-12", jo.id, "2026-11-12");
      expect(await told(sam.id)).toHaveLength(3);
    });

    it("AE10: with pass-along off, Jo can't hand Gull & Anchor on: Jo gives it back, and Ben's request waits for you", async () => {
      await expect(app.passAlong(joHasGullAndAnchor.id, jo.id)).rejects.toThrow(
        "Pass-along is off for this copy.",
      );
      expect(
        (await app.getLoan(joHasGullAndAnchor.id, jo.id, TODAY)).handoff,
      ).toBeNull();
      await app.giveBack(joHasGullAndAnchor.id, TODAY, jo.id, TODAY);
      const { nextInLine } = await app.confirmReturn(
        joHasGullAndAnchor.id,
        { answer: "back", returnedOn: TODAY, note: null },
        you.id,
        TODAY,
      );
      expect(nextInLine).toBe(benAskedForGullAndAnchor.id);
      expect(await loanOf(benAskedForGullAndAnchor.id)).toMatchObject({
        status: "requested",
      });
      expect(await told(ben.id)).toEqual([]);
    });

    it("closes a request for more time when it's handed on", async () => {
      await app.askMoreTime(
        youHaveMossAndMortar.id,
        { dueOn: "2026-11-20", note: null },
        you.id,
        TODAY,
      );
      await app.passAlong(youHaveMossAndMortar.id, you.id);
      expect(await loanOf(youHaveMossAndMortar.id)).toMatchObject({
        status: "passing",
        moreTimeDueOn: null,
        moreTimeAskedAt: null,
      });
    });

    it("I still have it puts both loans back, and the next friend is told", async () => {
      await app.passAlong(youHaveMossAndMortar.id, you.id);
      await app.takeBackPassAlong(youHaveMossAndMortar.id, you.id);
      expect(await loanOf(youHaveMossAndMortar.id)).toMatchObject({
        status: "out",
        returnedOn: null,
      });
      expect(await loanOf(joAskedForMossAndMortar.id)).toMatchObject({
        status: "requested",
        previousLoanId: null,
        periodDays: null,
        answeredAt: null,
      });
      expect(await told(jo.id)).toEqual([
        ["pass-along-to-confirm", joAskedForMossAndMortar.id, null],
        ["pass-along-taken-back", joAskedForMossAndMortar.id, null],
      ]);
      // Jo's confirmation after it was taken back is Changed underneath.
      await expect(
        app.confirmPassAlong(joAskedForMossAndMortar.id, TODAY, jo.id, TODAY),
      ).rejects.toBeInstanceOf(ChangedError);
    });

    it("a loan that's passing is never overdue, and the owner's stamp reads Handed on", async () => {
      await app.passAlong(youHaveMossAndMortar.id, you.id);
      const loan = await loanOf(youHaveMossAndMortar.id);
      expect(isOverdue(loan, "2026-11-20")).toBe(false);
      const copy = await copyOf(CAST.copies.samsMossAndMortar.id);
      const state = copyState(
        copy,
        await app.repos.loans.listOpenForCopies([copy.id]),
        sam.id,
        "2026-11-20",
      );
      expect(state.stamp).toEqual({ word: "Handed on", tone: "brown" });
    });

    it("tells Ben, behind Jo, that he's first now, and nobody twice", async () => {
      const bens = await join(CAST.copies.samsMossAndMortar.id, ben.id);
      await app.passAlong(youHaveMossAndMortar.id, you.id);
      expect(await told(ben.id)).toEqual([["turn-in-line", bens.id, null]]);
      // Taken back, Jo is first again, and is told only that it was taken back.
      await app.takeBackPassAlong(youHaveMossAndMortar.id, you.id);
      expect(await told(ben.id)).toHaveLength(1);
      expect((await told(jo.id)).map(([type]) => type)).toEqual([
        "pass-along-to-confirm",
        "pass-along-taken-back",
      ]);
    });

    it("a call-back puts the next friend back in line, and tells them they're first", async () => {
      await app.passAlong(youHaveMossAndMortar.id, you.id);
      await app.callBack(youHaveMossAndMortar.id, sam.id, TODAY);
      expect(await loanOf(joAskedForMossAndMortar.id)).toMatchObject({
        status: "requested",
        periodDays: null,
      });
      expect((await told(jo.id)).at(-1)).toEqual([
        "turn-in-line",
        joAskedForMossAndMortar.id,
        null,
      ]);
      // Called back, it can't be handed on.
      await expect(
        app.passAlong(youHaveMossAndMortar.id, you.id),
      ).rejects.toThrow("It’s been called back.");
    });

    it("refuses the owner, an empty line, and hands it on only once", async () => {
      await expect(
        app.passAlong(youHaveMossAndMortar.id, sam.id),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await app.withdrawRequest(joAskedForMossAndMortar.id, jo.id);
      await expect(
        app.passAlong(youHaveMossAndMortar.id, you.id),
      ).rejects.toBeInstanceOf(ChangedError);
    });

    it("shows each borrower the other's name and phone for the handoff, friends or not", async () => {
      const robins = await app.getLoan(youHaveMossAndMortar.id, you.id, TODAY);
      expect(robins.handoff).toMatchObject({ name: "Jo", phone: "555 0117" });
      await app.passAlong(youHaveMossAndMortar.id, you.id);
      const jos = await app.getLoan(joAskedForMossAndMortar.id, jo.id, TODAY);
      expect(jos.handoff).toMatchObject({
        name: "Robin Vale",
        phone: "555 0199",
      });

      // Noor, Sam's friend and not yours, next in line.
      await app.takeBackPassAlong(youHaveMossAndMortar.id, you.id);
      await app.withdrawRequest(joAskedForMossAndMortar.id, jo.id);
      const noors = await join(CAST.copies.samsMossAndMortar.id, noor.id);
      expect(
        (await app.getLoan(youHaveMossAndMortar.id, you.id, TODAY)).handoff,
      ).toMatchObject({ name: "Noor", phone: null });
      await app.passAlong(youHaveMossAndMortar.id, you.id);
      expect(
        (await app.getLoan(noors.id, noor.id, TODAY)).handoff,
      ).toMatchObject({ name: "Robin Vale", phone: "555 0199" });
    });
  });
});
