import { describe, expect, it } from "bun:test";
import {
  type CopyStamp,
  canMove,
  copyState,
  datesAtPickUp,
  dueOn,
  isOverdue,
  LOAN_ACTORS,
  LOAN_MOVES,
  LOAN_PERIOD_DAYS,
  LOAN_STATUSES,
  type LoanActor,
  type LoanMove,
  type LoanStatus,
  lineOf,
  PASS_ALONG_FOLLOW_ONS,
} from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";

// The canvas's cast (KTD13): Sam owns the copy, Ben borrows it, Jo and Priya wait in its line, and
// Alice is another of Sam's friends.
const SAM = "00000000-0000-4000-8000-000000000001";
const BEN = "00000000-0000-4000-8000-000000000002";
const JO = "00000000-0000-4000-8000-000000000003";
const PRIYA = "00000000-0000-4000-8000-000000000004";
const ALICE = "00000000-0000-4000-8000-000000000005";
const COPY = "10000000-0000-4000-8000-000000000001";

let loans = 0;
function loan(fields: Partial<Loan> = {}): Loan {
  loans += 1;
  return {
    id: `20000000-0000-4000-8000-${String(loans).padStart(12, "0")}`,
    userGameId: COPY,
    borrowerUserId: BEN,
    previousLoanId: null,
    status: "requested",
    requestNote: null,
    periodDays: null,
    dueOn: null,
    pickedUpOn: null,
    returnedOn: null,
    moreTimeDueOn: null,
    moreTimeNote: null,
    moreTimeAskedAt: null,
    calledBackAt: null,
    answeredAt: null,
    createdAt: new Date("2026-11-01T15:00:00Z"),
    updatedAt: new Date("2026-11-01T15:00:00Z"),
    ...fields,
  };
}

// Ben's loan, picked up on Fri, Nov 6 for a week. Today is Tue, Nov 10 (C5).
const TODAY = "2026-11-10";
const out = (fields: Partial<Loan> = {}) =>
  loan({
    status: "out",
    periodDays: 7,
    pickedUpOn: "2026-11-06",
    dueOn: "2026-11-13",
    ...fields,
  });

describe("a loan's moves", () => {
  // data-model.md's table of statuses: where each can move.
  const DATA_MODEL: Record<LoanStatus, LoanStatus[]> = {
    requested: ["accepted", "declined", "withdrawn"],
    accepted: ["out", "cancelled", "requested"],
    out: ["returning", "passing", "returned"],
    returning: ["returned", "out"],
    passing: ["passed-along", "out"],
    returned: [],
    "passed-along": [],
    declined: [],
    withdrawn: [],
    cancelled: [],
  };

  const moves = Object.keys(LOAN_MOVES) as LoanMove[];

  it("make every move data-model.md's table draws, and no other", () => {
    const made = new Set<string>();
    for (const move of moves) {
      const { from, to } = LOAN_MOVES[move];
      for (const status of from) {
        if (status !== to) {
          expect(DATA_MODEL[status]).toContain(to);
          made.add(`${status} > ${to}`);
        }
      }
    }
    // A pass-along's second loan moves with the first.
    for (const { from, to } of Object.values(PASS_ALONG_FOLLOW_ONS)) {
      expect(DATA_MODEL[from]).toContain(to);
      made.add(`${from} > ${to}`);
    }
    const drawn = LOAN_STATUSES.flatMap((status) =>
      DATA_MODEL[status].map((to) => `${status} > ${to}`),
    );
    expect([...made].sort()).toEqual(drawn.sort());
  });

  it("leave the five ends where they are", () => {
    for (const status of [
      "returned",
      "passed-along",
      "declined",
      "withdrawn",
      "cancelled",
    ] as const) {
      for (const move of moves) {
        for (const actor of LOAN_ACTORS) {
          expect(canMove(loan({ status }), move, actor)).toBe(false);
        }
      }
    }
  });

  // Who may make each move, from which statuses, and where it goes: written out here, apart from
  // loan.ts, so a change to either shows.
  const RULES: Record<
    LoanMove,
    { from: LoanStatus[]; to: LoanStatus; by: LoanActor[] }
  > = {
    accept: { from: ["requested"], to: "accepted", by: ["owner"] },
    decline: { from: ["requested"], to: "declined", by: ["owner"] },
    withdraw: { from: ["requested"], to: "withdrawn", by: ["borrower"] },
    cancel: { from: ["accepted"], to: "cancelled", by: ["owner", "borrower"] },
    "confirm-pick-up": {
      from: ["accepted"],
      to: "out",
      by: ["owner", "borrower"],
    },
    "give-back": { from: ["out"], to: "returning", by: ["borrower"] },
    "confirm-return": {
      from: ["out", "returning"],
      to: "returned",
      by: ["owner"],
    },
    "not-back-yet": { from: ["returning"], to: "out", by: ["owner"] },
    "pass-along": { from: ["out"], to: "passing", by: ["borrower"] },
    "confirm-pass-along": {
      from: ["passing"],
      to: "passed-along",
      by: ["next-in-line"],
    },
    "take-back": { from: ["passing"], to: "out", by: ["borrower"] },
    "call-back": { from: ["out", "passing"], to: "out", by: ["owner"] },
    "ask-more-time": { from: ["out"], to: "out", by: ["borrower"] },
    "answer-more-time": { from: ["out"], to: "out", by: ["owner"] },
    "change-due-date": { from: ["out"], to: "out", by: ["owner"] },
  };

  it("are the ones written out here", () => {
    expect(Object.keys(LOAN_MOVES).sort()).toEqual(Object.keys(RULES).sort());
    for (const move of moves) {
      expect<LoanStatus>(LOAN_MOVES[move].to).toBe(RULES[move].to);
    }
  });

  // For each move, who may make it from each status: exactly the people the rules name, from the
  // statuses they name, and nobody from any other. A loan here is plain (not called back, no
  // request for more time, not a pass-along's), except that answering more time needs one waiting.
  for (const move of Object.keys(RULES) as LoanMove[]) {
    const { from, by } = RULES[move];
    it(`let only ${by.join(" or ")} ${move}, from ${from.join(" or ")}`, () => {
      const whoMay = (status: LoanStatus) => {
        const plain = loan(
          move === "answer-more-time"
            ? { status, moreTimeAskedAt: new Date("2026-11-09T12:00:00Z") }
            : { status },
        );
        return LOAN_ACTORS.filter((actor) => canMove(plain, move, actor));
      };
      expect(
        Object.fromEntries(
          LOAN_STATUSES.map((status) => [status, whoMay(status)]),
        ),
      ).toEqual(
        Object.fromEntries(
          LOAN_STATUSES.map((status) => [
            status,
            from.includes(status) ? by : [],
          ]),
        ),
      );
    });
  }

  it("leave a loan that's called back only one way to go: back to its owner", () => {
    const calledBack = out({ calledBackAt: new Date("2026-11-10T14:00:00Z") });
    expect(canMove(calledBack, "pass-along", "borrower")).toBe(false);
    expect(canMove(calledBack, "ask-more-time", "borrower")).toBe(false);
    expect(canMove(calledBack, "call-back", "owner")).toBe(false);
    expect(canMove(calledBack, "give-back", "borrower")).toBe(true);
    expect(canMove(calledBack, "confirm-return", "owner")).toBe(true);
    expect(canMove(calledBack, "change-due-date", "owner")).toBe(true);
  });

  it("take one request for more time at a time, and answer only one that waits", () => {
    const waiting = out({
      moreTimeDueOn: "2026-11-20",
      moreTimeAskedAt: new Date("2026-11-09T12:00:00Z"),
    });
    expect(canMove(waiting, "ask-more-time", "borrower")).toBe(false);
    expect(canMove(waiting, "answer-more-time", "owner")).toBe(true);
    expect(canMove(out(), "answer-more-time", "owner")).toBe(false);
  });

  it("move a pass-along's next loan only through the giver's", () => {
    const giver = out({ status: "passing" });
    const next = loan({
      status: "accepted",
      borrowerUserId: JO,
      previousLoanId: giver.id,
      periodDays: 7,
    });
    for (const actor of LOAN_ACTORS) {
      expect(canMove(next, "confirm-pick-up", actor)).toBe(false);
      expect(canMove(next, "cancel", actor)).toBe(false);
    }
    expect(canMove(giver, "confirm-pass-along", "next-in-line")).toBe(true);
    expect(canMove(giver, "take-back", "borrower")).toBe(true);
    expect(canMove(giver, "call-back", "owner")).toBe(true);
  });
});

describe("a loan's dates", () => {
  it("offers a week, two weeks and a month", () => {
    expect(LOAN_PERIOD_DAYS).toEqual([7, 14, 30]);
  });

  it("counts a period from the pick-up, with a month as 30 days", () => {
    expect(dueOn("2026-11-06", 7)).toBe("2026-11-13");
    expect(dueOn("2026-11-10", 14)).toBe("2026-11-24");
    // A calendar month from Dec 1 would end on Jan 1.
    expect(dueOn("2026-12-01", 30)).toBe("2026-12-31");
  });

  it("dates a period from the day picked up, so confirming late doesn't move it (D5)", () => {
    // Two weeks, picked up today (C3: "it's due Tue, Nov 24").
    expect(datesAtPickUp({ periodDays: 14, dueOn: null }, TODAY)).toEqual({
      periodDays: 14,
      dueOn: "2026-11-24",
    });
    // A week, picked up last Friday and confirmed today.
    expect(datesAtPickUp({ periodDays: 7, dueOn: null }, "2026-11-06")).toEqual(
      { periodDays: 7, dueOn: "2026-11-13" },
    );
  });

  it("keeps a picked date, and makes its period the days to it", () => {
    expect(
      datesAtPickUp({ periodDays: null, dueOn: "2026-11-27" }, TODAY),
    ).toEqual({ periodDays: 17, dueOn: "2026-11-27" });
  });

  it("gives a pass-along's next loan the giver's period, from its own pick-up (R48)", () => {
    const giver = datesAtPickUp(
      { periodDays: null, dueOn: "2026-11-13" },
      "2026-11-06",
    );
    expect(
      datesAtPickUp({ periodDays: giver.periodDays, dueOn: null }, TODAY),
    ).toEqual({ periodDays: 7, dueOn: "2026-11-17" });
  });

  it("refuses a loan said yes to with neither a period nor a date", () => {
    expect(() =>
      datesAtPickUp({ periodDays: null, dueOn: null }, TODAY),
    ).toThrow();
  });
});

describe("isOverdue", () => {
  it("is overdue only once today is past the due date", () => {
    expect(isOverdue(out(), "2026-11-12")).toBe(false);
    expect(isOverdue(out(), "2026-11-13")).toBe(false);
    expect(isOverdue(out(), "2026-11-14")).toBe(true);
  });

  it("is never overdue while it's given back or handed on (D15)", () => {
    expect(isOverdue(out({ status: "returning" }), "2026-11-30")).toBe(false);
    expect(isOverdue(out({ status: "passing" }), "2026-11-30")).toBe(false);
  });

  it("is never overdue once it's over, or before it's picked up", () => {
    for (const status of LOAN_STATUSES.filter((status) => status !== "out")) {
      expect(isOverdue(out({ status }), "2026-11-30")).toBe(false);
    }
    expect(
      isOverdue(
        loan({ status: "accepted", dueOn: "2026-11-13" }),
        "2026-11-30",
      ),
    ).toBe(false);
  });
});

describe("lineOf", () => {
  it("is the open requests, oldest first, whatever else the copy has had", () => {
    const priya = loan({
      borrowerUserId: PRIYA,
      createdAt: new Date("2026-11-08T09:00:00Z"),
    });
    const jo = loan({
      borrowerUserId: JO,
      createdAt: new Date("2026-11-07T18:30:00Z"),
    });
    const ben = out();
    const alice = loan({
      borrowerUserId: ALICE,
      status: "withdrawn",
      createdAt: new Date("2026-11-02T10:00:00Z"),
    });
    const all = [priya, ben, alice, jo];

    expect(lineOf(all)).toEqual([jo, priya]);
    // The copy's own list is left as it was.
    expect(all).toEqual([priya, ben, alice, jo]);
  });

  it("orders two asked in the same instant by id, the same on every read", () => {
    const at = new Date("2026-11-08T09:00:00Z");
    const first = loan({ borrowerUserId: JO, createdAt: at });
    const second = loan({ borrowerUserId: PRIYA, createdAt: at });
    expect(lineOf([second, first])).toEqual([first, second]);
    expect(lineOf([first, second])).toEqual([first, second]);
  });
});

describe("copyState", () => {
  const copy = { userId: SAM, lendable: true };
  const asked = (
    borrowerUserId: string,
    day: number,
    fields: Partial<Loan> = {},
  ) =>
    loan({
      borrowerUserId,
      createdAt: new Date(`2026-11-0${day}T12:00:00Z`),
      ...fields,
    });

  describe("while Ben has it, with Jo and then Priya in line", () => {
    const ben = out();
    const jo = asked(JO, 7);
    const priya = asked(PRIYA, 8);
    // An old loan to Alice, long over.
    const before = out({
      borrowerUserId: ALICE,
      status: "returned",
      returnedOn: "2026-10-28",
    });
    const copyLoans = [priya, before, ben, jo];
    const stateFor = (viewer: string) =>
      copyState(copy, copyLoans, viewer, TODAY);

    it("shows its owner where it is, and the loans behind it", () => {
      expect(stateFor(SAM)).toEqual({
        kind: "out",
        yours: true,
        stamp: { word: "Out to Nov 13", tone: "brown" },
        holder: ben,
        promised: null,
        line: [jo, priya],
      });
    });

    it("shows its borrower when it's due", () => {
      expect(stateFor(BEN)).toMatchObject({
        kind: "you-have-it",
        yours: false,
        stamp: { word: "Due Fri", tone: "navy" },
      });
    });

    it("shows the next friend in line their place, and the one after theirs", () => {
      expect(stateFor(JO)).toMatchObject({
        kind: "in-line",
        stamp: { word: "1st in line", tone: "brown" },
      });
      expect(stateFor(PRIYA)).toMatchObject({
        kind: "in-line",
        stamp: { word: "2nd in line", tone: "brown" },
      });
    });

    it("shows another friend it's out, and until when", () => {
      expect(stateFor(ALICE)).toMatchObject({
        kind: "out",
        yours: false,
        stamp: { word: "Out to Nov 13", tone: "brown" },
        holder: ben,
        line: [jo, priya],
      });
    });
  });

  describe("while it's home", () => {
    it("is available to its owner and to friends", () => {
      for (const viewer of [SAM, ALICE]) {
        expect(copyState(copy, [], viewer, TODAY)).toMatchObject({
          kind: "available",
          yours: viewer === SAM,
          stamp: { word: "Available", tone: "navy" },
          holder: null,
          promised: null,
          line: [],
        });
      }
    });

    it("is not lent when its owner doesn't lend it", () => {
      for (const viewer of [SAM, ALICE]) {
        expect(
          copyState({ userId: SAM, lendable: false }, [], viewer, TODAY),
        ).toMatchObject({
          kind: "not-lent",
          stamp: { word: "Not lent", tone: "brown" },
        });
      }
    });

    it("waits on its owner once asked for, and on the owner for the one who asked", () => {
      const copyLoans = [asked(JO, 7), asked(PRIYA, 8)];
      const stateFor = (viewer: string) =>
        copyState(copy, copyLoans, viewer, TODAY);
      expect(stateFor(SAM)).toMatchObject({
        kind: "requested",
        stamp: { word: "Requested", tone: "red" },
      });
      expect(stateFor(JO)).toMatchObject({
        kind: "you-asked",
        stamp: { word: "You asked", tone: "brown" },
      });
      expect(stateFor(PRIYA)).toMatchObject({
        kind: "in-line",
        stamp: { word: "2nd in line", tone: "brown" },
      });
      expect(stateFor(ALICE)).toMatchObject({
        kind: "requested",
        stamp: { word: "Asked for", tone: "brown" },
      });
    });

    it("waits for its pick-up once its owner said yes", () => {
      const copyLoans = [
        asked(JO, 7, { status: "accepted", periodDays: 14 }),
        asked(PRIYA, 8),
      ];
      const stateFor = (viewer: string) =>
        copyState(copy, copyLoans, viewer, TODAY);
      expect(stateFor(SAM)).toMatchObject({
        kind: "promised",
        stamp: { word: "Said yes", tone: "navy" },
      });
      expect(stateFor(JO)).toMatchObject({
        kind: "to-pick-up",
        stamp: { word: "Pick it up", tone: "red" },
      });
      // First in line now, but behind Jo's yes.
      expect(stateFor(PRIYA)).toMatchObject({
        kind: "in-line",
        stamp: { word: "1st in line", tone: "brown" },
      });
      expect(stateFor(ALICE)).toMatchObject({
        kind: "promised",
        stamp: { word: "Asked for", tone: "brown" },
      });
    });
  });

  describe("as its due date comes and goes", () => {
    const stamp = (dueDay: string, viewer: string, today: string) =>
      copyState(copy, [out({ dueOn: dueDay })], viewer, today).stamp;

    it("tells its borrower the weekday within the week, then the date", () => {
      expect(stamp("2026-11-13", BEN, TODAY)).toEqual({
        word: "Due Fri",
        tone: "navy",
      });
      expect(stamp("2026-11-16", BEN, TODAY)).toEqual({
        word: "Due Mon",
        tone: "navy",
      });
      expect(stamp("2026-11-17", BEN, TODAY)).toEqual({
        word: "Due Nov 17",
        tone: "navy",
      });
    });

    it("waits on its borrower the day it's due", () => {
      expect(stamp(TODAY, BEN, TODAY)).toEqual({
        word: "Due today",
        tone: "red",
      });
    });

    it("is late for its borrower and its owner the day after, and out for anyone else", () => {
      const late: CopyStamp = { word: "Overdue", tone: "late" };
      expect(stamp("2026-11-09", BEN, TODAY)).toEqual(late);
      expect(stamp("2026-11-09", SAM, TODAY)).toEqual(late);
      expect(stamp("2026-11-09", ALICE, TODAY)).toEqual({
        word: "Out to Nov 9",
        tone: "brown",
      });
    });
  });

  it("waits on its owner once given back, and never runs late (D15)", () => {
    const back = [
      out({
        status: "returning",
        dueOn: "2026-11-09",
        returnedOn: "2026-11-09",
      }),
    ];
    expect(copyState(copy, back, SAM, TODAY)).toMatchObject({
      kind: "out",
      stamp: { word: "Given back", tone: "red" },
    });
    expect(copyState(copy, back, BEN, TODAY)).toMatchObject({
      kind: "you-have-it",
      stamp: { word: "Gave it back", tone: "brown" },
    });
  });

  it("waits on the next friend while a pass-along is handed on", () => {
    const ben = out({ status: "passing", dueOn: "2026-11-09" });
    const jo = asked(JO, 7, {
      status: "accepted",
      previousLoanId: ben.id,
      periodDays: 7,
    });
    const priya = asked(PRIYA, 8);
    const stateFor = (viewer: string) =>
      copyState(copy, [ben, jo, priya], viewer, TODAY);

    expect(stateFor(SAM)).toMatchObject({
      kind: "out",
      stamp: { word: "Handed on", tone: "brown" },
      holder: ben,
      promised: jo,
      line: [priya],
    });
    expect(stateFor(BEN)).toMatchObject({
      kind: "you-have-it",
      stamp: { word: "Handed on", tone: "brown" },
    });
    expect(stateFor(JO)).toMatchObject({
      kind: "handed-to-you",
      stamp: { word: "Handed to you", tone: "red" },
    });
    expect(stateFor(PRIYA)).toMatchObject({
      kind: "in-line",
      stamp: { word: "1st in line", tone: "brown" },
    });
  });

  it("keeps showing a loan its owner stopped lending in the middle of", () => {
    expect(
      copyState({ userId: SAM, lendable: false }, [out()], BEN, TODAY),
    ).toMatchObject({ kind: "you-have-it" });
  });

  it("numbers a long line's places", () => {
    const borrower = (place: number) =>
      `30000000-0000-4000-8000-${String(place).padStart(12, "0")}`;
    const line = Array.from({ length: 24 }, (_, index) =>
      loan({
        borrowerUserId: borrower(index + 1),
        createdAt: new Date(Date.UTC(2026, 10, 1, index)),
      }),
    );
    const words = [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 24].map(
      (place) =>
        copyState(copy, [out(), ...line], borrower(place), TODAY).stamp.word,
    );
    expect(words).toEqual([
      "1st in line",
      "2nd in line",
      "3rd in line",
      "4th in line",
      "11th in line",
      "12th in line",
      "13th in line",
      "21st in line",
      "22nd in line",
      "23rd in line",
      "24th in line",
    ]);
  });
});
