import { eq } from "drizzle-orm";
import { removedUsers } from "@/db/schema";
import type { IRemovedUsersRepository } from "@/src/application/repositories/removed-users.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class RemovedUsersRepository
  extends BaseRepository
  implements IRemovedUsersRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "removedUsers");
  }

  async isRemoved(userId: string, tx?: ITransaction): Promise<boolean> {
    try {
      const [row] = await this.getDbContext(tx)
        .select({ userId: removedUsers.userId })
        .from(removedUsers)
        .where(eq(removedUsers.userId, userId))
        .limit(1);
      return row !== undefined;
    } catch (err) {
      this.handleError(err, "isRemoved", { userId });
    }
  }
}
