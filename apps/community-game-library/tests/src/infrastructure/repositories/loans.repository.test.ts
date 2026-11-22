import { beforeEach, expect, it } from "bun:test";
import { copyState } from "@/src/entities/loan";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST, CAST_TODAY, castRows } from "@/tests/_support/cast";

const { you } = CAST.people;
const { copies, loans } = CAST;
const ids = (found: { id: string }[]) => found.map(({ id }) => id);

describeEachBackend("ILoansRepository", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("lists each copy's open loans, oldest first, without the ones that ended", async () => {
    const open = await app.repos.loans.listOpenForCopies([
      copies.yourGullAndAnchor.id,
      copies.alicesHarborLights.id,
    ]);

    expect(ids(open)).toEqual([
      loans.joHasGullAndAnchor.id,
      loans.benHasAlicesHarborLights.id,
      loans.joAskedForAlicesHarborLights.id,
      loans.benAskedForGullAndAnchor.id,
    ]);
    expect(await app.repos.loans.listOpenForCopies([])).toEqual([]);
  });

  it("finds the loan that has a copy now, and none for a copy that's home", async () => {
    const current = (copyId: string) =>
      app.repos.loans.getCurrentForCopy(copyId);

    expect(await current(copies.yourGullAndAnchor.id)).toMatchObject({
      id: loans.joHasGullAndAnchor.id,
      status: "out",
      pickedUpOn: "2026-11-02",
      dueOn: "2026-11-09",
      moreTimeDueOn: "2026-11-13",
      moreTimeNote: "Out of town until Thursday.",
    });
    expect(await current(copies.samsMossAndMortar.id)).toMatchObject({
      id: loans.youHaveMossAndMortar.id,
      borrowerUserId: you.id,
      dueOn: "2026-11-13",
    });
    // Asked for, and home.
    expect(await current(copies.yourNightMarket.id)).toBeUndefined();
    expect(await current(copies.samsHarborLights.id)).toBeUndefined();
  });

  // B7: Jo, Nov 2 to now; Priya, Sep 12 to Sep 26; Sam, Aug 1 to Aug 15.
  it("gives a copy's history, newest pick-up first, the loan out now included", async () => {
    const history = await app.repos.loans.listHistoryForCopy(
      copies.yourGullAndAnchor.id,
    );

    expect(
      history.map(({ id, pickedUpOn, returnedOn }) => ({
        id,
        pickedUpOn,
        returnedOn,
      })),
    ).toEqual([
      {
        id: loans.joHasGullAndAnchor.id,
        pickedUpOn: "2026-11-02",
        returnedOn: null,
      },
      {
        id: loans.priyaHadGullAndAnchor.id,
        pickedUpOn: "2026-09-12",
        returnedOn: "2026-09-26",
      },
      {
        id: loans.samHadGullAndAnchor.id,
        pickedUpOn: "2026-08-01",
        returnedOn: "2026-08-15",
      },
    ]);
    expect(
      await app.repos.loans.listHistoryForCopy(copies.yourNightMarket.id),
    ).toEqual([]);
  });

  // B12's Most borrowed counts pick-ups, the loan out now included, never a request.
  it("counts each copy's pick-ups", async () => {
    const counts = await app.repos.loans.countPickedUpForCopies([
      copies.yourGullAndAnchor.id,
      copies.priyasFenwickFair.id,
      copies.yourNightMarket.id,
    ]);

    expect(counts).toEqual(
      [
        { userGameId: copies.yourGullAndAnchor.id, count: 3 },
        { userGameId: copies.priyasFenwickFair.id, count: 2 },
      ].sort((a, b) => (a.userGameId < b.userGameId ? -1 : 1)),
    );
    expect(await app.repos.loans.countPickedUpForCopies([])).toEqual([]);
  });

  // The cast is the boards' world: each copy, read back, is in the state its board stamps it
  // with for you, on the canvas's today (B1, B5, B6, C4).
  it("reads the cast's copies back in the states the boards show", async () => {
    const stamps: Record<string, string> = {};
    for (const copy of castRows().copies) {
      const open = await app.repos.loans.listOpenForCopies([copy.id]);
      stamps[copy.id] = copyState(copy, open, you.id, CAST_TODAY).stamp.word;
    }

    expect(stamps).toEqual({
      [copies.yourGullAndAnchor.id]: "Overdue",
      [copies.yourNightMarket.id]: "Requested",
      [copies.yourPaperKites.id]: "Not lent",
      [copies.yourSaltAndSignal.id]: "Available",
      [copies.samsMossAndMortar.id]: "Due Fri",
      [copies.samsQuarryLane.id]: "You asked",
      [copies.samsHarborLights.id]: "Available",
      [copies.alicesHarborLights.id]: "Out to Nov 20",
      [copies.priyasFenwickFair.id]: "1st in line",
      [copies.alicesTinKettleDerby.id]: "Available",
      [copies.josSaltAndSignal.id]: "Available",
    });
  });
});
