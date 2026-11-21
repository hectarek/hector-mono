import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { loans } from "@/db/schema";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import {
  HOLDING_STATUSES,
  OPEN_STATUSES,
  PICKED_UP_STATUSES,
} from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class LoansRepository
  extends BaseRepository
  implements ILoansRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "loans");
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
}
