import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { notices } from "@/db/schema";
import {
  INBOX_LIMIT,
  type INoticesRepository,
} from "@/src/application/repositories/notices.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { NewNotice, Notice } from "@/src/entities/models/notice.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { NoticeType } from "@/src/entities/notice-types";
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

  async listForUser(userId: string, tx?: ITransaction): Promise<Notice[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(notices)
        .where(eq(notices.userId, userId))
        .orderBy(desc(notices.createdAt), desc(notices.id))
        .limit(INBOX_LIMIT);
    } catch (err) {
      this.handleError(err, "listForUser", { userId });
    }
  }

  async countUnread(
    userId: string,
    types: readonly NoticeType[],
    tx?: ITransaction,
  ): Promise<number> {
    if (types.length === 0) {
      return 0;
    }
    try {
      const [row] = await this.getDbContext(tx)
        .select({ unread: count() })
        .from(notices)
        .where(
          and(
            eq(notices.userId, userId),
            isNull(notices.readAt),
            inArray(notices.type, [...types]),
          ),
        );
      return row?.unread ?? 0;
    } catch (err) {
      this.handleError(err, "countUnread", { userId });
    }
  }

  async markRead(
    userId: string,
    noticeIds: readonly string[],
    tx: ITransaction,
  ): Promise<void> {
    if (noticeIds.length === 0) {
      return;
    }
    try {
      await this.getDbContext(tx)
        .update(notices)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notices.userId, userId),
            inArray(notices.id, [...noticeIds]),
            isNull(notices.readAt),
          ),
        );
    } catch (err) {
      this.handleError(err, "markRead", { userId });
    }
  }
}
