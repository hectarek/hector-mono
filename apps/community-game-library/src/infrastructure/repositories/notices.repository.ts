import { notices } from "@/db/schema";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { NewNotice, Notice } from "@/src/entities/models/notice.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class NoticesRepository
  extends BaseRepository
  implements INoticesRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "notices");
  }

  async add(notice: NewNotice, tx: ITransaction): Promise<Notice> {
    try {
      const [created] = await this.getDbContext(tx)
        .insert(notices)
        .values(notice)
        .returning();
      if (!created) {
        throw new DatabaseOperationError("add failed");
      }
      return created;
    } catch (err) {
      this.handleError(err, "add", { userId: notice.userId });
    }
  }
}
