import { tags } from "@/db/schema";
import type { ITagsRepository } from "@/src/application/repositories/tags.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { TagGroups } from "@/src/entities/models/tag.model";
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
}
