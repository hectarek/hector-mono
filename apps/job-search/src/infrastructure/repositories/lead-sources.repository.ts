import { and, eq, sql } from "drizzle-orm";
import { leadSources } from "@/db/schema";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import {
  type AddedSource,
  type LeadSource,
  sourceNameKey,
} from "@/src/entities/models/lead-source.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

const SOURCE = { id: leadSources.id, name: leadSources.name };

export class LeadSourcesRepository
  extends BaseRepository
  implements ILeadSourcesRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "lead-sources");
  }

  async add(
    ownerId: string,
    name: string,
    tx: ITransaction,
  ): Promise<AddedSource> {
    const nameKey = sourceNameKey(name);
    try {
      const db = this.getDbContext(tx);
      // The unique index on the owner and name key decides: a source added meanwhile, by
      // another session, is the one this finds after its insert does nothing.
      const [added] = await db
        .insert(leadSources)
        .values({ ownerId, name, nameKey })
        .onConflictDoNothing()
        .returning(SOURCE);
      if (added) {
        return { source: added, created: true };
      }
      const [listed] = await db
        .select(SOURCE)
        .from(leadSources)
        .where(
          and(
            eq(leadSources.ownerId, ownerId),
            eq(leadSources.nameKey, nameKey),
          ),
        );
      if (!listed) {
        throw new DatabaseOperationError("add found no source to answer with");
      }
      return { source: listed, created: false };
    } catch (err) {
      this.handleError(err, "add", { ownerId });
    }
  }

  async list(ownerId: string): Promise<LeadSource[]> {
    try {
      // By code point ("C"), as the mock sorts.
      return await this.getDbContext()
        .select(SOURCE)
        .from(leadSources)
        .where(eq(leadSources.ownerId, ownerId))
        .orderBy(sql`${leadSources.nameKey} collate "C"`, leadSources.id);
    } catch (err) {
      this.handleError(err, "list", { ownerId });
    }
  }
}
