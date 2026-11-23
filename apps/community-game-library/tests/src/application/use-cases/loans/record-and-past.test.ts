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
  InputParseError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { lineOf } from "@/src/entities/loan";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice, priya, ben, mei, sam, jo } = CAST.people;
const {
  yourSaltAndSignal,
  yourNightMarket,
  yourGullAndAnchor,
  yourPaperKites,
  samsHarborLights,
} = CAST.copies;
const { priyaAskedForNightMarket } = CAST.loans;
// The kit's today, Tue Nov 10, 2026.
const TODAY = "2026-11-10";

describeEachBackend("recording a loan, and past loans (U16)", () => {
  let app: ReturnType<typeof makeApp>;
  const told = async (userId: string) =>
    (await app.noticesOf(userId)).map((notice) => [notice.type, notice.loanId]);

  beforeEach(async () => {
    setSystemTime(new Date("2026-11-10T09:30:00-05:00"));
    app = makeApp();
    await app.makeCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  describe("Record a loan (R17, C9)", () => {
    it("records Salt & Signal to Alice from Sunday for 2 weeks: out from that day, and Alice is told", async () => {
      const loan = await app.recordLoan(
        {
          userGameId: yourSaltAndSignal.id,
          borrowerUserId: alice.id,
          pickedUpOn: "2026-11-08",
          periodDays: 14,
        },
        you.id,
        TODAY,
      );
      expect(loan).toMatchObject({
        status: "out",
        borrowerUserId: alice.id,
        pickedUpOn: "2026-11-08",
        periodDays: 14,
        dueOn: "2026-11-22",
      });
      expect(await told(alice.id)).toEqual([["loan-recorded", loan.id]]);
    });

    it("records until a picked date, whose days from the pick-up become its period", async () => {
      const loan = await app.recordLoan(
        {
          userGameId: yourSaltAndSignal.id,
          borrowerUserId: ben.id,
          pickedUpOn: TODAY,
          dueOn: "2026-11-20",
        },
        you.id,
        TODAY,
      );
      expect(loan).toMatchObject({ dueOn: "2026-11-20", periodDays: 10 });
    });

    it("turns Priya's request into the loan, and tells Ben, behind her, that he's first now", async () => {
      const bens = await app.requestLoan(
        { userGameId: yourNightMarket.id, note: null },
        ben.id,
      );
      const loan = await app.recordLoan(
        {
          userGameId: yourNightMarket.id,
          borrowerUserId: priya.id,
          pickedUpOn: TODAY,
          periodDays: 7,
        },
        you.id,
        TODAY,
      );
      expect(loan.id).toBe(priyaAskedForNightMarket.id);
      expect(loan).toMatchObject({ status: "out", dueOn: "2026-11-17" });
      expect(await told(ben.id)).toEqual([["turn-in-line", bens.id]]);
    });

    it("lends to someone else while Priya waits first in line, and tells her nothing new", async () => {
      await app.recordLoan(
        {
          userGameId: yourNightMarket.id,
          borrowerUserId: jo.id,
          pickedUpOn: TODAY,
          periodDays: 7,
        },
        you.id,
        TODAY,
      );
      const open = await app.repos.loans.listOpenForCopies([
        yourNightMarket.id,
      ]);
      expect(lineOf(open).map((loan) => loan.borrowerUserId)).toEqual([
        priya.id,
      ]);
      expect(await told(priya.id)).toEqual([]);
    });

    it("refuses a copy that's out, one not lent, someone else's, a stranger, and a day to come", async () => {
      const loan = {
        borrowerUserId: alice.id,
        pickedUpOn: TODAY,
        periodDays: 7,
      } as const;
      await expect(
        app.recordLoan(
          { ...loan, userGameId: yourGullAndAnchor.id },
          you.id,
          TODAY,
        ),
      ).rejects.toBeInstanceOf(ChangedError);
      await expect(
        app.recordLoan(
          { ...loan, userGameId: yourPaperKites.id },
          you.id,
          TODAY,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        app.recordLoan(
          { ...loan, userGameId: samsHarborLights.id },
          you.id,
          TODAY,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        app.recordLoan(
          {
            ...loan,
            userGameId: yourSaltAndSignal.id,
            borrowerUserId: mei.id,
          },
          you.id,
          TODAY,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        app.recordLoan(
          {
            ...loan,
            userGameId: yourSaltAndSignal.id,
            pickedUpOn: "2026-11-11",
          },
          you.id,
          TODAY,
        ),
      ).rejects.toBeInstanceOf(InputParseError);
    });

    it("offers your lendable copies at home, with who asked, and your friends by name", async () => {
      const { copies, friends } = await app.getRecordLoanChoices(you.id, TODAY);
      expect(
        copies.map((copy) => [copy.title, copy.askedBy?.name ?? null]),
      ).toEqual([
        ["Night Market", "Priya"],
        ["Salt & Signal", null],
      ]);
      expect(friends.map((friend) => friend.name)).toEqual([
        "Alice",
        "Ben",
        "Jo",
        "Priya",
        "Sam",
      ]);
    });
  });

  describe("Past loans (R23, C12)", () => {
    it("lists what you borrowed, newest first, with Fenwick Fair 3 days late", async () => {
      const { borrowed } = await app.listPastLoans(you.id);
      expect(
        borrowed.map(({ game, other, loan, daysLate }) => [
          game.title,
          other.name,
          loan.pickedUpOn,
          loan.returnedOn,
          daysLate,
        ]),
      ).toEqual([
        ["Harbor Lights", "Sam", "2026-10-14", "2026-10-28", 0],
        ["Tin Kettle Derby", "Alice", "2026-09-05", "2026-09-12", 0],
        ["Fenwick Fair", "Priya", "2026-08-02", "2026-08-30", 3],
      ]);
    });

    it("lists what you lent, and only each member's own", async () => {
      const { lent } = await app.listPastLoans(you.id);
      expect(lent.map(({ other }) => other.name)).toEqual(["Priya", "Sam"]);
      const sams = await app.listPastLoans(sam.id);
      expect(sams.borrowed.map(({ game }) => game.title)).toEqual([
        "Gull & Anchor",
      ]);
      expect(sams.lent.map(({ other }) => other.name)).toEqual(["Robin Vale"]);
    });

    it("lists a pass-along on both borrowers' past loans, and in the copy's history", async () => {
      const { youHaveMossAndMortar, joAskedForMossAndMortar } = CAST.loans;
      await app.passAlong(youHaveMossAndMortar.id, you.id);
      await app.confirmPassAlong(
        joAskedForMossAndMortar.id,
        TODAY,
        jo.id,
        TODAY,
      );
      const { borrowed } = await app.listPastLoans(you.id);
      expect(borrowed[0]).toMatchObject({
        loan: { id: youHaveMossAndMortar.id, status: "passed-along" },
        game: { title: "Moss & Mortar" },
      });
      const history = await app.repos.loans.listHistoryForCopy(
        CAST.copies.samsMossAndMortar.id,
      );
      expect(history.map((loan) => [loan.borrowerUserId, loan.status])).toEqual(
        [
          [jo.id, "out"],
          [you.id, "passed-along"],
        ],
      );
    });
  });
});
