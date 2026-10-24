import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type {
  ActivityEntry,
  ActivityFilter,
  ActivityPage,
  NewActivityEntry,
} from "@/src/entities/models/activity.model";

// The log in memory. Like the table, it orders by time and then by the order rows came in.
export class MockActivityRepository implements IActivityRepository {
  private readonly rows: { ownerId: string; entry: ActivityEntry }[] = [];

  async add({ ownerId, ...entry }: NewActivityEntry): Promise<void> {
    this.rows.push({
      ownerId,
      entry: { ...entry, id: this.rows.length + 1, createdAt: new Date() },
    });
  }

  async list(
    ownerId: string,
    { record, actor, since, until, limit, offset }: ActivityFilter,
  ): Promise<ActivityPage> {
    const matching = this.rows
      .filter(
        (row) =>
          row.ownerId === ownerId &&
          (!record ||
            (row.entry.record.kind === record.kind &&
              row.entry.record.id === record.id)) &&
          (!actor || row.entry.actor === actor) &&
          (!since || row.entry.createdAt >= since) &&
          (!until || row.entry.createdAt < until),
      )
      .map((row) => row.entry)
      .sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
      );
    return {
      entries: matching.slice(offset, offset + limit),
      nextOffset: matching.length > offset + limit ? offset + limit : null,
    };
  }
}
