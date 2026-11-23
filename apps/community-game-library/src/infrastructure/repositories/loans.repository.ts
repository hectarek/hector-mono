import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { loans } from "@/db/schema";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
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
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

// Past loans' order: the newest return first, then the newest pick-up, then the id.
const newestReturnFirst = [
  desc(loans.returnedOn),
  desc(loans.pickedUpOn),
  desc(loans.id),
] as const;

export class LoansRepository
  extends BaseRepository
  implements ILoansRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "loans");
  }

  async getById(id: string, tx?: ITransaction): Promise<Loan | undefined> {
    try {
      const [loan] = await this.getDbContext(tx)
        .select()
        .from(loans)
        .where(eq(loans.id, id))
        .limit(1);
      return loan;
    } catch (err) {
      this.handleError(err, "getById", { loanId: id });
    }
  }

  async create(loan: NewLoan, tx: ITransaction): Promise<Loan> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(loans)
        .values(loan)
        .returning();
      if (!row) {
        throw new Error("No row returned");
      }
      return row;
    } catch (err) {
      this.handleError(err, "create", {
        userGameId: loan.userGameId,
        borrowerUserId: loan.borrowerUserId,
      });
    }
  }

  async update(
    id: string,
    changes: LoanChanges,
    tx: ITransaction,
  ): Promise<Loan> {
    try {
      const [row] = await this.getDbContext(tx)
        .update(loans)
        .set(changes)
        .where(eq(loans.id, id))
        .returning();
      if (!row) {
        throw new Error("No row returned");
      }
      return row;
    } catch (err) {
      this.handleError(err, "update", { loanId: id });
    }
  }

  async listOpenForCopies(
    userGameIds: readonly string[],
    tx?: ITransaction,
  ): Promise<Loan[]> {
    if (userGameIds.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select()
        .from(loans)
        .where(
          and(
            inArray(loans.userGameId, [...userGameIds]),
            inArray(loans.status, [...OPEN_STATUSES]),
          ),
        )
        .orderBy(asc(loans.createdAt), asc(loans.id));
    } catch (err) {
      this.handleError(err, "listOpenForCopies");
    }
  }

  async getCurrentForCopy(
    userGameId: string,
    tx?: ITransaction,
  ): Promise<Loan | undefined> {
    try {
      const [loan] = await this.getDbContext(tx)
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.userGameId, userGameId),
            inArray(loans.status, [...HOLDING_STATUSES]),
          ),
        )
        .limit(1);
      return loan;
    } catch (err) {
      this.handleError(err, "getCurrentForCopy", { userGameId });
    }
  }

  async listHistoryForCopy(
    userGameId: string,
    tx?: ITransaction,
  ): Promise<Loan[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.userGameId, userGameId),
            inArray(loans.status, [...PICKED_UP_STATUSES]),
          ),
        )
        .orderBy(desc(loans.pickedUpOn), desc(loans.createdAt), desc(loans.id));
    } catch (err) {
      this.handleError(err, "listHistoryForCopy", { userGameId });
    }
  }

  async listInStatuses(
    statuses: readonly LoanStatus[],
    tx?: ITransaction,
  ): Promise<Loan[]> {
    if (statuses.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select()
        .from(loans)
        .where(inArray(loans.status, [...statuses]))
        .orderBy(asc(loans.createdAt), asc(loans.id));
    } catch (err) {
      this.handleError(err, "listInStatuses");
    }
  }

  async listEndedForBorrower(
    userId: string,
    tx?: ITransaction,
  ): Promise<Loan[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.borrowerUserId, userId),
            inArray(loans.status, [...ENDED_STATUSES]),
          ),
        )
        .orderBy(...newestReturnFirst);
    } catch (err) {
      this.handleError(err, "listEndedForBorrower", { userId });
    }
  }

  async listEndedForCopies(
    userGameIds: readonly string[],
    tx?: ITransaction,
  ): Promise<Loan[]> {
    if (userGameIds.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select()
        .from(loans)
        .where(
          and(
            inArray(loans.userGameId, [...userGameIds]),
            inArray(loans.status, [...ENDED_STATUSES]),
          ),
        )
        .orderBy(...newestReturnFirst);
    } catch (err) {
      this.handleError(err, "listEndedForCopies", {
        copies: String(userGameIds.length),
      });
    }
  }

  async countPickedUpForCopies(
    userGameIds: readonly string[],
    tx?: ITransaction,
  ): Promise<{ userGameId: string; count: number }[]> {
    if (userGameIds.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select({ userGameId: loans.userGameId, count: count() })
        .from(loans)
        .where(
          and(
            inArray(loans.userGameId, [...userGameIds]),
            inArray(loans.status, [...PICKED_UP_STATUSES]),
          ),
        )
        .groupBy(loans.userGameId)
        .orderBy(asc(loans.userGameId));
    } catch (err) {
      this.handleError(err, "countPickedUpForCopies");
    }
  }

  async setStatus(
    loanId: string,
    status: LoanStatus,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(loans)
        .set({ status })
        .where(eq(loans.id, loanId));
    } catch (err) {
      this.handleError(err, "setStatus", { loanId });
    }
  }

  async listByIds(ids: readonly string[], tx?: ITransaction): Promise<Loan[]> {
    if (ids.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select()
        .from(loans)
        .where(inArray(loans.id, [...ids]))
        .orderBy(asc(loans.createdAt), asc(loans.id));
    } catch (err) {
      this.handleError(err, "listByIds");
    }
  }

  async listOpenForBorrower(
    userId: string,
    tx?: ITransaction,
  ): Promise<Loan[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.borrowerUserId, userId),
            inArray(loans.status, [...OPEN_STATUSES]),
          ),
        )
        .orderBy(asc(loans.createdAt), asc(loans.id));
    } catch (err) {
      this.handleError(err, "listOpenForBorrower", { userId });
    }
  }
}
