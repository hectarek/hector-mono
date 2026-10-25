import { and, desc, eq, gte, lt } from "drizzle-orm";
import { activity } from "@/db/schema";
import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  ActivityEntry,
  ActivityFilter,
  ActivityPage,
  NewActivityEntry,
} from "@/src/entities/models/activity.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class ActivityRepository
  extends BaseRepository
  implements IActivityRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "activity");
  }

  async add(entry: NewActivityEntry, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx).insert(activity).values({
        ownerId: entry.ownerId,
        actor: entry.actor,
        tool: entry.tool,
        recordKind: entry.record.kind,
        recordId: entry.record.id,
        action: entry.action,
        changes: entry.changes,
        reason: entry.reason,
      });
    } catch (err) {
      this.handleError(err, "add", { ownerId: entry.ownerId });
    }
  }

  async list(
    ownerId: string,
    { record, actor, since, until, limit, offset }: ActivityFilter,
    tx?: ITransaction,
  ): Promise<ActivityPage> {
    try {
      // One more than the page, to tell whether another follows.
      const rows = await this.getDbContext(tx)
        .select()
        .from(activity)
        .where(
          and(
            eq(activity.ownerId, ownerId),
            record && eq(activity.recordKind, record.kind),
            record?.id === undefined
              ? undefined
              : eq(activity.recordId, record.id),
            actor && eq(activity.actor, actor),
            since && gte(activity.createdAt, since),
            until && lt(activity.createdAt, until),
          ),
        )
        .orderBy(desc(activity.createdAt), desc(activity.id))
        .limit(limit + 1)
        .offset(offset);
      return {
        entries: rows.slice(0, limit).map(toEntry),
        nextOffset: rows.length > limit ? offset + limit : null,
      };
    } catch (err) {
      this.handleError(err, "list", { ownerId });
    }
  }
}

function toEntry(row: typeof activity.$inferSelect): ActivityEntry {
  return {
    id: row.id,
    createdAt: row.createdAt,
    actor: row.actor,
    tool: row.tool,
    record: { kind: row.recordKind, id: row.recordId },
    action: row.action,
    changes: row.changes,
    reason: row.reason,
  };
}
