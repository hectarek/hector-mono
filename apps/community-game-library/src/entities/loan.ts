// A loan of a copy, from the request to its end (docs/data-model.md, Loans; KTD6): its statuses,
// the moves between them and who may make each, its dates, when it's overdue, a copy's line, and
// a copy's state for whoever is looking (R15, B13). Pure: a use case takes the copy's row lock,
// checks its move here, and writes it.
import { addDays, daysBetween, formatMonthDay, formatWeekday } from "./week";

// data-model.md's statuses, in its order.
export const LOAN_STATUSES = [
  "requested",
  "accepted",
  "out",
  "returning",
  "passing",
  "returned",
  "passed-along",
  "declined",
  "withdrawn",
  "cancelled",
] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

// While a loan has the copy. At most one loan per copy does (a partial unique index).
export const HOLDING_STATUSES = [
  "out",
  "returning",
  "passing",
] as const satisfies readonly LoanStatus[];

// From the request until it ends. A borrower has at most one open loan per copy (another partial
// unique index).
export const OPEN_STATUSES = [
  "requested",
  "accepted",
  ...HOLDING_STATUSES,
] as const satisfies readonly LoanStatus[];

// From the pick-up on, when picked_up_on and due_on are set (a check).
export const PICKED_UP_STATUSES = [
  ...HOLDING_STATUSES,
  "returned",
  "passed-along",
] as const satisfies readonly LoanStatus[];

const isIn = (statuses: readonly LoanStatus[], status: LoanStatus) =>
  statuses.includes(status);

// The fields of a loans row these rules read (src/entities/models/loan.model.ts has them all).
type LoanFields = {
  id: string;
  borrowerUserId: string;
  status: LoanStatus;
  previousLoanId: string | null;
  dueOn: string | null;
  calledBackAt: Date | null;
  moreTimeAskedAt: Date | null;
  createdAt: Date;
};

// Who makes a move, as the loan sees them (KTD6): its copy's owner, its borrower, or the next
// friend in line, to whom a pass-along hands the copy. Anyone else, the admin included, makes
// none (D4, AE7).
export const LOAN_ACTORS = ["owner", "borrower", "next-in-line"] as const;
export type LoanActor = (typeof LOAN_ACTORS)[number];

type MoveFields = Pick<
  LoanFields,
  "status" | "previousLoanId" | "calledBackAt" | "moreTimeAskedAt"
>;

type MoveRule = {
  from: readonly LoanStatus[];
  to: LoanStatus;
  by: readonly LoanActor[];
  // What else the loan must be, besides in a status the move starts from.
  when?: (loan: MoveFields) => boolean;
};

// A call-back leaves the loan only one way to go: back to its owner (R20).
const notCalledBack = (loan: MoveFields) => loan.calledBackAt === null;

// A pass-along's next loan, said yes to by the giver's handoff, moves only with the giver's: the
// next friend confirms it, the giver takes it back, or the owner calls it back.
const notHandedOn = (loan: MoveFields) => loan.previousLoanId === null;

// Every move a person makes, named for its use case. A move whose `to` is its `from` keeps the
// status and changes the loan's dates or notes. The daily run's close of a return left a week
// (D15, KTD8) is confirm-return's change, made by nobody, so it isn't here.
export const LOAN_MOVES = {
  // The owner's yes, to the first request in line while the copy is home (U12).
  accept: { from: ["requested"], to: "accepted", by: ["owner"] },
  // The owner's no, or taking someone out of the line (R16, R21).
  decline: { from: ["requested"], to: "declined", by: ["owner"] },
  // Withdrawing a request, or leaving the line (R21).
  withdraw: { from: ["requested"], to: "withdrawn", by: ["borrower"] },
  // Calling it off after a yes and before the pick-up, by either side (R21).
  cancel: {
    from: ["accepted"],
    to: "cancelled",
    by: ["owner", "borrower"],
    when: notHandedOn,
  },
  // "I've picked it up", or the owner's "Priya has it" (R18).
  "confirm-pick-up": {
    from: ["accepted"],
    to: "out",
    by: ["borrower", "owner"],
    when: notHandedOn,
  },
  // "I gave it back to Sam" (R19).
  "give-back": { from: ["out"], to: "returning", by: ["borrower"] },
  // "Yes, it's back", or marking it returned without waiting (R19).
  "confirm-return": {
    from: ["out", "returning"],
    to: "returned",
    by: ["owner"],
  },
  // "I don't have it yet": the loan runs again (R19).
  "not-back-yet": { from: ["returning"], to: "out", by: ["owner"] },
  // "I gave it to Jo" (R48). Its use case also checks the copy's pass_along and that someone is
  // in line.
  "pass-along": {
    from: ["out"],
    to: "passing",
    by: ["borrower"],
    when: notCalledBack,
  },
  // The next friend says they have it (R48).
  "confirm-pass-along": {
    from: ["passing"],
    to: "passed-along",
    by: ["next-in-line"],
  },
  // The giver's "I still have it".
  "take-back": { from: ["passing"], to: "out", by: ["borrower"] },
  // It ends any pass-along, moves the due date to today if it was later, and clears a waiting
  // request for more time (R20).
  "call-back": {
    from: ["out", "passing"],
    to: "out",
    by: ["owner"],
    when: notCalledBack,
  },
  "ask-more-time": {
    from: ["out"],
    to: "out",
    by: ["borrower"],
    when: (loan) => notCalledBack(loan) && loan.moreTimeAskedAt === null,
  },
  // Either answer clears the three more_time_ columns.
  "answer-more-time": {
    from: ["out"],
    to: "out",
    by: ["owner"],
    when: (loan) => loan.moreTimeAskedAt !== null,
  },
  // The owner changes the due date while it's out (R20).
  "change-due-date": { from: ["out"], to: "out", by: ["owner"] },
} as const satisfies Record<string, MoveRule>;
export type LoanMove = keyof typeof LOAN_MOVES;

// A pass-along moves two loans in one transaction: the giver's, by the move, and the next
// friend's, by these. Handing it on says yes to the first request in line, with previous_loan_id
// and the giver's period_days; the next friend's confirmation starts their loan that day; and
// taking it back, or calling it back while it's passing, puts their request back in line (R48).
export const PASS_ALONG_FOLLOW_ONS = {
  "pass-along": { from: "requested", to: "accepted" },
  "confirm-pass-along": { from: "accepted", to: "out" },
  "take-back": { from: "accepted", to: "requested" },
  "call-back": { from: "accepted", to: "requested" },
} as const satisfies Partial<
  Record<LoanMove, { from: LoanStatus; to: LoanStatus }>
>;

// Whether this person may make this move on this loan now. Where the move needs more than the
// loan (the copy home for a yes, its pass_along switch), its use case checks that too.
export function canMove(
  loan: MoveFields,
  move: LoanMove,
  actor: LoanActor,
): boolean {
  const rule: MoveRule = LOAN_MOVES[move];
  return (
    rule.from.includes(loan.status) &&
    rule.by.includes(actor) &&
    (rule.when?.(loan) ?? true)
  );
}

// What an owner picks when they say yes (R16): a week, two weeks or a month, a month being 30
// days, or a date of their own.
export const LOAN_PERIOD_DAYS = [7, 14, 30] as const;

// A period counts from the pick-up (D5): the due date is that day plus its days.
export function dueOn(pickedUpOn: string, periodDays: number): string {
  return addDays(pickedUpOn, periodDays);
}

// A loan's dates from its pick-up on (R18): the due date its period gives, or, when the owner
// picked a date, the days from the pick-up to it, so a pass-along's next loan can copy them (R48).
export function datesAtPickUp(
  loan: { periodDays: number | null; dueOn: string | null },
  pickedUpOn: string,
): { periodDays: number; dueOn: string } {
  if (loan.periodDays !== null) {
    return {
      periodDays: loan.periodDays,
      dueOn: dueOn(pickedUpOn, loan.periodDays),
    };
  }
  if (loan.dueOn !== null) {
    return {
      periodDays: daysBetween(pickedUpOn, loan.dueOn),
      dueOn: loan.dueOn,
    };
  }
  throw new Error("A loan said yes to has a period or a due date");
}

// Overdue isn't stored (D15): a loan is overdue while it's out and today, in Eastern time, is
// past its due date. One given back or handed on never is.
export function isOverdue(
  loan: Pick<LoanFields, "status" | "dueOn">,
  today: string,
): boolean {
  return loan.status === "out" && loan.dueOn !== null && today > loan.dueOn;
}

// A copy's line (R24): its open requests, oldest first. Two asked in the same instant go by id,
// so every read gives the same order.
export function lineOf<
  T extends Pick<LoanFields, "id" | "status" | "createdAt">,
>(loans: readonly T[]): T[] {
  return loans
    .filter((loan) => loan.status === "requested")
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
}

// A stamp's word and its ink (the design system's Stamp): navy is all good, red waits on the
// person looking now, brown is on hold or waiting on someone else, and late is solid red.
export type CopyStamp = {
  word: string;
  tone: "navy" | "red" | "brown" | "late";
};

const navy = (word: string): CopyStamp => ({ word, tone: "navy" });
const red = (word: string): CopyStamp => ({ word, tone: "red" });
const brown = (word: string): CopyStamp => ({ word, tone: "brown" });

type CopyLoan = Pick<
  LoanFields,
  "id" | "borrowerUserId" | "status" | "previousLoanId" | "dueOn" | "createdAt"
>;

// A copy's state for the person looking (R15, B13; KTD6's available, requested, you asked, 2nd in
// line, out until Nov 20, not lent and yours). The owner's copy takes the kinds a friend's does,
// with the owner's own stamps: "Requested" is someone asking for your copy, and "You asked" the
// other side of it (screens.md rule 7).
export type CopyState<L> = {
  kind:
    | "available"
    | "not-lent"
    // Home, with someone in line and no yes yet: the owner's to answer.
    | "requested"
    // Home, said yes to, waiting for its pick-up.
    | "promised"
    // Someone else has it: out, given back, or handed on.
    | "out"
    // The person looking asked, and it's the owner's to answer.
    | "you-asked"
    | "in-line"
    | "to-pick-up"
    // A pass-along handed it to them, for them to confirm.
    | "handed-to-you"
    | "you-have-it";
  // The person looking owns it: B13's "Your copy".
  yours: boolean;
  stamp: CopyStamp;
  // Its open loans, for the words beside the stamp ("Ben has it", "Jo is 1st in line").
  holder: L | null;
  promised: L | null;
  line: L[];
};

// "1st", "2nd", "11th": a place in a line.
export function ordinal(place: number): string {
  const lastTwo = place % 100;
  if (lastTwo < 11 || lastTwo > 13) {
    const suffix = ["th", "st", "nd", "rd"][place % 10];
    if (suffix) {
      return `${place}${suffix}`;
    }
  }
  return `${place}th`;
}

// "Out to Nov 20", as the library's cards say it.
const outTo = (loan: CopyLoan): CopyStamp =>
  brown(loan.dueOn === null ? "Out" : `Out to ${formatMonthDay(loan.dueOn)}`);

// The holder's own stamp: "Due Fri" within the week, then "Due Nov 27".
function holderStamp(loan: CopyLoan, today: string): CopyStamp {
  if (loan.status === "returning") {
    return brown("Gave it back");
  }
  if (loan.status === "passing") {
    return brown("Handed on");
  }
  if (loan.dueOn === null) {
    return outTo(loan);
  }
  if (isOverdue(loan, today)) {
    return { word: "Overdue", tone: "late" };
  }
  if (loan.dueOn === today) {
    return red("Due today");
  }
  return navy(
    `Due ${daysBetween(today, loan.dueOn) < 7 ? formatWeekday(loan.dueOn) : formatMonthDay(loan.dueOn)}`,
  );
}

// The owner's stamp while someone else has their copy.
function ownersOutStamp(loan: CopyLoan, today: string): CopyStamp {
  if (loan.status === "returning") {
    return red("Given back");
  }
  if (loan.status === "passing") {
    return brown("Handed on");
  }
  return isOverdue(loan, today)
    ? { word: "Overdue", tone: "late" }
    : outTo(loan);
}

// `loans` are the copy's: any status, since only the open ones count.
export function copyState<L extends CopyLoan>(
  copy: { userId: string; lendable: boolean },
  loans: readonly L[],
  viewerId: string,
  today: string,
): CopyState<L> {
  const open = loans.filter((loan) => isIn(OPEN_STATUSES, loan.status));
  const holder =
    open.find((loan) => isIn(HOLDING_STATUSES, loan.status)) ?? null;
  const promised = open.find((loan) => loan.status === "accepted") ?? null;
  const line = lineOf(open);
  const yours = copy.userId === viewerId;
  const state = (kind: CopyState<L>["kind"], stamp: CopyStamp) => ({
    kind,
    yours,
    stamp,
    holder,
    promised,
    line,
  });

  // The person looking's own open loan on it: never the owner's, who can't borrow their own copy.
  const mine = yours
    ? undefined
    : open.find((loan) => loan.borrowerUserId === viewerId);
  if (mine === undefined) {
    if (holder) {
      return state(
        "out",
        yours ? ownersOutStamp(holder, today) : outTo(holder),
      );
    }
    if (promised) {
      return state("promised", yours ? navy("Said yes") : brown("Asked for"));
    }
    if (line.length > 0) {
      return state("requested", yours ? red("Requested") : brown("Asked for"));
    }
    return copy.lendable
      ? state("available", navy("Available"))
      : state("not-lent", brown("Not lent"));
  }
  if (mine === holder) {
    return state("you-have-it", holderStamp(mine, today));
  }
  if (mine === promised) {
    return mine.previousLoanId === null
      ? state("to-pick-up", red("Pick it up"))
      : state("handed-to-you", red("Handed to you"));
  }
  const place = line.indexOf(mine) + 1;
  return place === 1 && !holder && !promised
    ? state("you-asked", brown("You asked"))
    : state("in-line", brown(`${ordinal(place)} in line`));
}
