import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import {
  ENDED_STATUSES,
  HOLDING_STATUSES,
  type LoanStatus,
  OPEN_STATUSES,
  PICKED_UP_STATUSES,
} from "@/src/entities/loan";
import type {
  Loan,
  LoanChanges,
  NewLoan,
} from "@/src/entities/models/loan.model";

const open: readonly LoanStatus[] = OPEN_STATUSES;
const holding: readonly LoanStatus[] = HOLDING_STATUSES;
const pickedUp: readonly LoanStatus[] = PICKED_UP_STATUSES;
const ended: readonly LoanStatus[] = ENDED_STATUSES;

// The real repository's orders: a timestamp, then the id.
const compare = (a: string | number, b: string | number) =>
  a < b ? -1 : a > b ? 1 : 0;
const oldestFirst = (a: Loan, b: Loan) =>
  compare(a.createdAt.getTime(), b.createdAt.getTime()) || compare(a.id, b.id);
const newestPickUpFirst = (a: Loan, b: Loan) =>
  compare(b.pickedUpOn ?? "", a.pickedUpOn ?? "") ||
  compare(b.createdAt.getTime(), a.createdAt.getTime()) ||
  compare(b.id, a.id);

const newestReturnFirst = (a: Loan, b: Loan) =>
  compare(b.returnedOn ?? "", a.returnedOn ?? "") ||
  compare(b.pickedUpOn ?? "", a.pickedUpOn ?? "") ||
  compare(b.id, a.id);

export class MockLoansRepository implements ILoansRepository {
  // The loans its reads see: the cast's, which makeCast puts here (tests/_support/app.ts), and
  // what the use cases write.
  readonly rows: Loan[] = [];

  async getById(id: string): Promise<Loan | undefined> {
    const loan = this.rows.find((row) => row.id === id);
    return loan && { ...loan };
  }

  async create(loan: NewLoan): Promise<Loan> {
    // As loans_one_open_per_borrower_idx.
    if (
      this.rows.some(
        (row) =>
          row.userGameId === loan.userGameId &&
          row.borrowerUserId === loan.borrowerUserId &&
          open.includes(row.status),
      )
    ) {
      throw new DatabaseOperationError("create failed");
    }
    const now = new Date();
    const row: Loan = {
      id: crypto.randomUUID(),
      userGameId: loan.userGameId,
      borrowerUserId: loan.borrowerUserId,
      previousLoanId: null,
      status: "requested",
      requestNote: loan.requestNote ?? null,
      periodDays: null,
      dueOn: null,
      pickedUpOn: null,
      returnedOn: null,
      moreTimeDueOn: null,
      moreTimeNote: null,
      moreTimeAskedAt: null,
      calledBackAt: null,
      answeredAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return { ...row };
  }

  async update(id: string, changes: LoanChanges): Promise<Loan> {
    const loan = this.rows.find((row) => row.id === id);
    if (!loan) {
      throw new DatabaseOperationError("update failed");
    }
    // As loans_one_promised_idx and loans_one_holder_idx.
    const next = { ...loan, ...changes };
    const clash = (statuses: readonly LoanStatus[]) =>
      statuses.includes(next.status) &&
      this.rows.some(
        (row) =>
          row.id !== id &&
          row.userGameId === next.userGameId &&
          statuses.includes(row.status),
      );
    if (clash(["accepted"]) || clash(holding)) {
      throw new DatabaseOperationError("update failed");
    }
    Object.assign(loan, changes, { updatedAt: new Date() });
    return { ...loan };
  }

  async listOpenForCopies(userGameIds: readonly string[]): Promise<Loan[]> {
    const copies = new Set(userGameIds);
    return this.rows
      .filter(
        (loan) => copies.has(loan.userGameId) && open.includes(loan.status),
      )
      .sort(oldestFirst)
      .map((loan) => ({ ...loan }));
  }

  async getCurrentForCopy(userGameId: string): Promise<Loan | undefined> {
    const loan = this.rows.find(
      (row) => row.userGameId === userGameId && holding.includes(row.status),
    );
    return loan && { ...loan };
  }

  async listHistoryForCopy(userGameId: string): Promise<Loan[]> {
    return this.rows
      .filter(
        (loan) =>
          loan.userGameId === userGameId && pickedUp.includes(loan.status),
      )
      .sort(newestPickUpFirst)
      .map((loan) => ({ ...loan }));
  }

  async listInStatuses(statuses: readonly LoanStatus[]): Promise<Loan[]> {
    return this.rows
      .filter((loan) => statuses.includes(loan.status))
      .sort(oldestFirst)
      .map((loan) => ({ ...loan }));
  }

  async listEndedForBorrower(userId: string): Promise<Loan[]> {
    return this.rows
      .filter(
        (loan) => loan.borrowerUserId === userId && ended.includes(loan.status),
      )
      .sort(newestReturnFirst)
      .map((loan) => ({ ...loan }));
  }

  async listEndedForCopies(userGameIds: readonly string[]): Promise<Loan[]> {
    const copies = new Set(userGameIds);
    return this.rows
      .filter(
        (loan) => copies.has(loan.userGameId) && ended.includes(loan.status),
      )
      .sort(newestReturnFirst)
      .map((loan) => ({ ...loan }));
  }

  async countPickedUpForCopies(
    userGameIds: readonly string[],
  ): Promise<{ userGameId: string; count: number }[]> {
    const copies = new Set(userGameIds);
    const counts = new Map<string, number>();
    for (const loan of this.rows) {
      if (copies.has(loan.userGameId) && pickedUp.includes(loan.status)) {
        counts.set(loan.userGameId, (counts.get(loan.userGameId) ?? 0) + 1);
      }
    }
    return [...counts]
      .map(([userGameId, count]) => ({ userGameId, count }))
      .sort((a, b) => compare(a.userGameId, b.userGameId));
  }

  async setStatus(loanId: string, status: LoanStatus): Promise<void> {
    const loan = this.rows.find((row) => row.id === loanId);
    if (loan) {
      Object.assign(loan, { status, updatedAt: new Date() });
    }
  }

  async listByIds(ids: readonly string[]): Promise<Loan[]> {
    const wanted = new Set(ids);
    return this.rows
      .filter((loan) => wanted.has(loan.id))
      .sort(oldestFirst)
      .map((loan) => ({ ...loan }));
  }

  async listOpenForBorrower(userId: string): Promise<Loan[]> {
    return this.rows
      .filter(
        (loan) => loan.borrowerUserId === userId && open.includes(loan.status),
      )
      .sort(oldestFirst)
      .map((loan) => ({ ...loan }));
  }
}
