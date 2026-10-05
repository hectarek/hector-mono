import { tags } from "@/db/schema";
import type { ITagsRepository } from "@/src/application/repositories/tags.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { TagGroups } from "@/src/entities/models/tag.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class TagsRepository extends BaseRepository implements ITagsRepository {
  constructor(logger: ILoggerService) {
    super(logger, "tags");
  }

  async listGroups(): Promise<TagGroups> {
    try {
      const rows = await this.getDbContext()
        .select({ name: tags.name, category: tags.category })
        .from(tags);
      return Object.fromEntries(rows.map((row) => [row.name, row.category]));
    } catch (err) {
      this.handleError(err, "listGroups");
    }
  }

  async addGroups(groups: TagGroups, tx?: ITransaction): Promise<void> {
    const rows = Object.entries(groups).map(([name, category]) => ({
      name,
      category,
    }));
    if (rows.length === 0) {
      return;
    }
    try {
      await this.getDbContext(tx)
        .insert(tags)
        .values(rows)
        .onConflictDoNothing();
    } catch (err) {
      this.handleError(err, "addGroups", { count: rows.length });
    }
  }
}
