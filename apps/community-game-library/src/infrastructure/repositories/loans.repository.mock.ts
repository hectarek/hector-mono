import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import {
  HOLDING_STATUSES,
  type LoanStatus,
  OPEN_STATUSES,
  PICKED_UP_STATUSES,
} from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";

const open: readonly LoanStatus[] = OPEN_STATUSES;
const holding: readonly LoanStatus[] = HOLDING_STATUSES;
const pickedUp: readonly LoanStatus[] = PICKED_UP_STATUSES;

// The real repository's orders: a timestamp, then the id.
const compare = (a: string | number, b: string | number) =>
  a < b ? -1 : a > b ? 1 : 0;
const oldestFirst = (a: Loan, b: Loan) =>
  compare(a.createdAt.getTime(), b.createdAt.getTime()) || compare(a.id, b.id);
const newestPickUpFirst = (a: Loan, b: Loan) =>
  compare(b.pickedUpOn ?? "", a.pickedUpOn ?? "") ||
  compare(b.createdAt.getTime(), a.createdAt.getTime()) ||
  compare(b.id, a.id);

export class MockLoansRepository implements ILoansRepository {
  // The loans its reads see. Tests put them here (makeCast, tests/_support/app.ts) until Batch 4
  // gives loans their writes.
  readonly rows: Loan[] = [];

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
}
