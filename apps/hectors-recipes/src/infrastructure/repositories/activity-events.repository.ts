import { and, desc, eq, isNotNull, max, sql } from "drizzle-orm";
import { activityEvents } from "@/db/schema";
import type { IActivityEventsRepository } from "@/src/application/repositories/activity-events.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import {
  type ActivityEvent,
  type ActivityType,
  isActivityType,
  type NewActivity,
} from "@/src/entities/models/activity-event.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class ActivityEventsRepository
  extends BaseRepository
  implements IActivityEventsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "activityEvents");
  }

  async add(event: NewActivity, tx?: ITransaction): Promise<void> {
    try {
      const db = this.getDbContext(tx);
      // Now, or just after this person's newest event, whichever is later: two within one
      // tick of the clock still keep the order they happened in.
      const newest = db
        .select({ occurredAt: max(activityEvents.occurredAt) })
        .from(activityEvents)
        .where(eq(activityEvents.userId, event.userId));
      await db.insert(activityEvents).values({
        ...event,
        occurredAt: sql`greatest(now(), (${newest}) + interval '1 millisecond')`,
      });
    } catch (err) {
      this.handleError(err, "add", { type: event.type });
    }
  }

  async latest(
    userId: string,
    type: ActivityType,
    tx?: ITransaction,
  ): Promise<ActivityEvent | null> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(activityEvents)
        .where(
          and(eq(activityEvents.userId, userId), eq(activityEvents.type, type)),
        )
        .orderBy(desc(activityEvents.occurredAt))
        .limit(1);
      if (!row || !isActivityType(row.type)) return null;
      return { ...row, type: row.type };
    } catch (err) {
      this.handleError(err, "latest", { userId, type });
    }
  }

  async recentRecipeIds(
    userId: string,
    type: ActivityType,
    tx?: ITransaction,
  ): Promise<string[]> {
    try {
      const last = max(activityEvents.occurredAt);
      const rows = await this.getDbContext(tx)
        .select({ recipeId: activityEvents.recipeId, last })
        .from(activityEvents)
        .where(
          and(
            eq(activityEvents.userId, userId),
            eq(activityEvents.type, type),
            isNotNull(activityEvents.recipeId),
          ),
        )
        .groupBy(activityEvents.recipeId)
        .orderBy(desc(last));
      return rows.flatMap((row) => (row.recipeId ? [row.recipeId] : []));
    } catch (err) {
      this.handleError(err, "recentRecipeIds", { userId, type });
    }
  }
}
