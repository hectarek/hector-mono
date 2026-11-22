import { beforeEach, describe, expect, it } from "bun:test";
import {
  ChangedError,
  InputParseError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  postgresRepositories,
} from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";
import { resetDatabase } from "@/tests/_support/database";

const { you, sam, priya, alice, noor, jo } = CAST.people;
const {
  samsHarborLights,
  alicesHarborLights,
  yourNightMarket,
  yourPaperKites,
  samsQuarryLane,
} = CAST.copies;
const {
  priyaAskedForNightMarket,
  youAskedForQuarryLane,
  youAskedForFenwickFair,
  joHasGullAndAnchor,
  joAskedForAlicesHarborLights,
} = CAST.loans;
// The kit's today, Tue Nov 10, 2026.
const TODAY = "2026-11-10";

describeEachBackend("requests and their answers (U12)", () => {
  let app: ReturnType<typeof makeApp>;
  const told = async (userId: string) =>
    (await app.noticesOf(userId)).map((notice) => ({
      type: notice.type,
      createdBy: notice.createdBy,
      loanId: notice.loanId,
      answerNote: notice.answerNote,
    }));

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  describe("Ask to borrow (R16, C1)", () => {
    it("asks for Sam's Harbor Lights with a note, tells Sam, and lists it under You asked", async () => {
      const loan = await app.requestLoan(
        { userGameId: samsHarborLights.id, note: "Can I grab it Friday?" },
        you.id,
      );
      expect(loan).toMatchObject({
        status: "requested",
        borrowerUserId: you.id,
        requestNote: "Can I grab it Friday?",
      });
      expect(await told(sam.id)).toEqual([
        {
          type: "loan-requested",
          createdBy: you.id,
          loanId: loan.id,
          answerNote: null,
        },
      ]);
      const { youAsked } = await app.listLoans(you.id, TODAY);
      expect(youAsked.map((item) => item.game.title)).toEqual([
        "Quarry Lane",
        "Harbor Lights",
      ]);
    });

    it("keeps the first request when asked twice", async () => {
      const first = await app.requestLoan(
        { userGameId: samsHarborLights.id, note: null },
        you.id,
      );
      const again = await app.requestLoan(
        { userGameId: samsHarborLights.id, note: "Again" },
        you.id,
      );
      expect(again.id).toBe(first.id);
      expect(await told(sam.id)).toHaveLength(1);
    });

    it("is Changed underneath for a copy that's out or said yes to", async () => {
      await expect(
        app.requestLoan(
          { userGameId: alicesHarborLights.id, note: null },
          you.id,
        ),
      ).rejects.toMatchObject({ reason: "copy-lent" });
      await app.answerRequest(
        priyaAskedForNightMarket.id,
        { answer: "yes", periodDays: 14, note: null },
        you.id,
        TODAY,
      );
      await expect(
        app.requestLoan({ userGameId: yourNightMarket.id, note: null }, sam.id),
      ).rejects.toBeInstanceOf(ChangedError);
    });

    it("joins the line behind someone who asked first, and tells the owner someone joined", async () => {
      const loan = await app.requestLoan(
        { userGameId: yourNightMarket.id, note: null },
        alice.id,
      );
      expect(await told(you.id)).toEqual([
        {
          type: "line-joined",
          createdBy: alice.id,
          loanId: loan.id,
          answerNote: null,
        },
      ]);
      expect((await app.listLoans(alice.id, TODAY)).youAsked).toEqual([]);
    });

    it("refuses your own copy, a stranger's and one that isn't lent (AE8)", async () => {
      await expect(
        app.requestLoan({ userGameId: yourPaperKites.id, note: null }, you.id),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        app.requestLoan(
          { userGameId: yourNightMarket.id, note: null },
          noor.id,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        app.requestLoan({ userGameId: yourPaperKites.id, note: null }, sam.id),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("Withdraw a request (R21, C16)", () => {
    it("withdraws your request for Quarry Lane and tells Sam", async () => {
      await app.withdrawRequest(youAskedForQuarryLane.id, you.id);
      expect(await told(sam.id)).toEqual([
        {
          type: "request-withdrawn",
          createdBy: you.id,
          loanId: youAskedForQuarryLane.id,
          answerNote: null,
        },
      ]);
      expect((await app.listLoans(you.id, TODAY)).youAsked).toEqual([]);
      expect((await app.listLoans(sam.id, TODAY)).needsYou).toEqual([]);
    });

    it("tells nobody when the request was further back in a line", async () => {
      await app.withdrawRequest(youAskedForFenwickFair.id, you.id);
      expect(await told(priya.id)).toEqual([]);
    });

    it("is only the borrower's, and a request answered meanwhile is Changed underneath", async () => {
      await expect(
        app.withdrawRequest(youAskedForQuarryLane.id, sam.id),
      ).rejects.toBeInstanceOf(NotFoundError);
      await app.answerRequest(
        youAskedForQuarryLane.id,
        { answer: "yes", periodDays: 7, note: null },
        sam.id,
        TODAY,
      );
      await expect(
        app.withdrawRequest(youAskedForQuarryLane.id, you.id),
      ).rejects.toMatchObject({ reason: "request-answered" });
    });
  });

  describe("The owner's answer (R16, D4, C2)", () => {
    it("says yes for 2 weeks, tells Priya, and leaves Needs you", async () => {
      await app.answerRequest(
        priyaAskedForNightMarket.id,
        { answer: "yes", periodDays: 14, note: "It's on the porch." },
        you.id,
        TODAY,
      );
      const { loan } = await app.getLoan(
        priyaAskedForNightMarket.id,
        priya.id,
        TODAY,
      );
      expect(loan).toMatchObject({
        status: "accepted",
        periodDays: 14,
        dueOn: null,
      });
      expect(loan.answeredAt).toBeInstanceOf(Date);
      expect(await told(priya.id)).toEqual([
        {
          type: "request-accepted",
          createdBy: you.id,
          loanId: priyaAskedForNightMarket.id,
          answerNote: "It's on the porch.",
        },
      ]);
      expect((await app.listLoans(you.id, TODAY)).needsYou).toEqual([]);
    });

    it("says yes until a picked date after today, and refuses today", async () => {
      await expect(
        app.answerRequest(
          priyaAskedForNightMarket.id,
          { answer: "yes", dueOn: TODAY, note: null },
          you.id,
          TODAY,
        ),
      ).rejects.toBeInstanceOf(InputParseError);
      await app.answerRequest(
        priyaAskedForNightMarket.id,
        { answer: "yes", dueOn: "2026-11-20", note: null },
        you.id,
        TODAY,
      );
      const { loan } = await app.getLoan(
        priyaAskedForNightMarket.id,
        you.id,
        TODAY,
      );
      expect(loan).toMatchObject({
        status: "accepted",
        dueOn: "2026-11-20",
        periodDays: null,
      });
    });

    it("says no with a note, which goes only on Priya's notice", async () => {
      await app.answerRequest(
        priyaAskedForNightMarket.id,
        { answer: "no", note: "It's out of town this week." },
        you.id,
        TODAY,
      );
      expect(await told(priya.id)).toEqual([
        {
          type: "request-declined",
          createdBy: you.id,
          loanId: priyaAskedForNightMarket.id,
          answerNote: "It's out of town this week.",
        },
      ]);
      expect((await app.listLoans(priya.id, TODAY)).youAsked).toEqual([]);
    });

    it("refuses anyone but the owner, the admin included (AE7)", async () => {
      // Priya, who asked.
      await expect(
        app.answerRequest(
          priyaAskedForNightMarket.id,
          { answer: "yes", periodDays: 7, note: null },
          priya.id,
          TODAY,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      // You, the admin, on Jo's request for Alice's copy.
      await expect(
        app.answerRequest(
          joAskedForAlicesHarborLights.id,
          { answer: "no", note: null },
          you.id,
          TODAY,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("is Changed underneath when the request was withdrawn or answered already", async () => {
      await app.withdrawRequest(youAskedForQuarryLane.id, you.id);
      await expect(
        app.answerRequest(
          youAskedForQuarryLane.id,
          { answer: "yes", periodDays: 7, note: null },
          sam.id,
          TODAY,
        ),
      ).rejects.toMatchObject({ reason: "request-withdrawn" });
      await app.answerRequest(
        priyaAskedForNightMarket.id,
        { answer: "no", note: null },
        you.id,
        TODAY,
      );
      await expect(
        app.answerRequest(
          priyaAskedForNightMarket.id,
          { answer: "yes", periodDays: 7, note: null },
          you.id,
          TODAY,
        ),
      ).rejects.toMatchObject({ reason: "request-answered" });
    });
  });

  describe("Calling off a yes before the pick-up (R21, C17, C3)", () => {
    beforeEach(async () => {
      await app.answerRequest(
        priyaAskedForNightMarket.id,
        { answer: "yes", periodDays: 14, note: null },
        you.id,
        TODAY,
      );
    });

    it("lets the owner cancel, and tells Priya", async () => {
      await app.cancelLoan(priyaAskedForNightMarket.id, you.id);
      const notices = await told(priya.id);
      expect(notices.at(-1)).toEqual({
        type: "loan-cancelled",
        createdBy: you.id,
        loanId: priyaAskedForNightMarket.id,
        answerNote: null,
      });
    });

    it("lets the borrower cancel, and tells the owner", async () => {
      await app.cancelLoan(priyaAskedForNightMarket.id, priya.id);
      expect(await told(you.id)).toEqual([
        {
          type: "loan-cancelled",
          createdBy: priya.id,
          loanId: priyaAskedForNightMarket.id,
          answerNote: null,
        },
      ]);
      const { loan } = await app.getLoan(
        priyaAskedForNightMarket.id,
        you.id,
        TODAY,
      );
      expect(loan.status).toBe("cancelled");
    });

    it("refuses a request not said yes to, and a loan picked up already", async () => {
      await expect(
        app.cancelLoan(youAskedForQuarryLane.id, sam.id),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        app.cancelLoan(joHasGullAndAnchor.id, you.id),
      ).rejects.toThrow("It’s been picked up already.");
    });
  });

  describe("A loan's page and Loans (C2, C4, C16)", () => {
    it("shows the owner and the borrower each other, the phone while it's open, and nobody else (AE8)", async () => {
      const asOwner = await app.getLoan(
        youAskedForQuarryLane.id,
        sam.id,
        TODAY,
      );
      expect(asOwner).toMatchObject({
        role: "owner",
        other: { name: you.name, phone: you.phone },
      });
      expect(asOwner.copy.id).toBe(samsQuarryLane.id);
      expect(asOwner.game.title).toBe("Quarry Lane");
      const asBorrower = await app.getLoan(
        youAskedForQuarryLane.id,
        you.id,
        TODAY,
      );
      expect(asBorrower).toMatchObject({
        role: "borrower",
        other: { name: "Sam", phone: sam.phone },
      });
      await expect(
        app.getLoan(youAskedForQuarryLane.id, jo.id, TODAY),
      ).rejects.toBeInstanceOf(NotFoundError);

      await app.withdrawRequest(youAskedForQuarryLane.id, you.id);
      expect(
        (await app.getLoan(youAskedForQuarryLane.id, sam.id, TODAY)).other
          .phone,
      ).toBeNull();
    });

    it("lists the cast's requests as C4 does: Priya's to you, and yours to Sam", async () => {
      const mine = await app.listLoans(you.id, TODAY);
      expect(
        mine.needsYou.map((item) => [item.other.name, item.game.title]),
      ).toEqual([["Priya", "Night Market"]]);
      expect(
        mine.youAsked.map((item) => [item.other.name, item.game.title]),
      ).toEqual([["Sam", "Quarry Lane"]]);
      const sams = await app.listLoans(sam.id, TODAY);
      expect(
        sams.needsYou.map((item) => [item.other.name, item.game.title]),
      ).toEqual([[you.name, "Quarry Lane"]]);
    });
  });
});

describe("two answers at once (U12, on Postgres)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  // KTD6: the copy's lock makes the second answer see the first, so one lands.
  it("lands one answer, and the other is Changed underneath", async () => {
    const app = makeApp(postgresRepositories());
    await app.makeCast();
    const results = await Promise.allSettled([
      app.answerRequest(
        priyaAskedForNightMarket.id,
        { answer: "yes", periodDays: 14, note: null },
        you.id,
        TODAY,
      ),
      app.answerRequest(
        priyaAskedForNightMarket.id,
        { answer: "no", note: null },
        you.id,
        TODAY,
      ),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
    const failed = results.find((result) => result.status === "rejected");
    expect(
      failed?.status === "rejected" ? failed.reason : undefined,
    ).toBeInstanceOf(ChangedError);
  });
});
