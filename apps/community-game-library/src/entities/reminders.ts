// Which reminders the daily run writes on a day (KTD8, R25, D15), and which returns it closes.
// Pure: the run reads the loans and nights, asks these, and writes what they answer, each with
// the day it's for, so a second run that day writes nothing.
import type { LoanStatus } from "./loan";
import { daysBetween } from "./week";

// A loan's reminders: the borrower's two days before and on the day, the owner's on the day, and
// both sides' the day after and every three days after, while it's out (AE3). One given back, or
// handed on, gets none (D15).
export type LoanReminder = {
  userId: string;
  type: "due-soon" | "due-today" | "due-back-today" | "overdue";
};

const DUE_SOON_DAYS = 2;
const OVERDUE_EVERY_DAYS = 3;

export function loanReminders(
  loan: { status: LoanStatus; dueOn: string | null; borrowerUserId: string },
  ownerId: string,
  today: string,
): LoanReminder[] {
  if (loan.status !== "out" || loan.dueOn === null) {
    return [];
  }
  const toGo = daysBetween(today, loan.dueOn);
  if (toGo === DUE_SOON_DAYS) {
    return [{ userId: loan.borrowerUserId, type: "due-soon" }];
  }
  if (toGo === 0) {
    return [
      { userId: loan.borrowerUserId, type: "due-today" },
      { userId: ownerId, type: "due-back-today" },
    ];
  }
  const late = -toGo;
  if (late >= 1 && (late - 1) % OVERDUE_EVERY_DAYS === 0) {
    return [
      { userId: loan.borrowerUserId, type: "overdue" },
      { userId: ownerId, type: "overdue" },
    ];
  }
  return [];
}

// A return its owner leaves unanswered this long closes by itself, on the borrower's day (D15).
const RETURN_CLOSES_AFTER_DAYS = 7;

export function returnClosesToday(
  loan: { status: LoanStatus; returnedOn: string | null },
  today: string,
): boolean {
  return (
    loan.status === "returning" &&
    loan.returnedOn !== null &&
    daysBetween(loan.returnedOn, today) >= RETURN_CLOSES_AFTER_DAYS
  );
}
