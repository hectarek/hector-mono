import { eq } from "drizzle-orm";
import { importRefs } from "@/db/schema";
import type { IImportRefsRepository } from "@/src/application/repositories/import-refs.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { RecordRef } from "@/src/entities/models/activity.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class ImportRefsRepository
  extends BaseRepository
  implements IImportRefsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "import-refs");
  }

  async list(ownerId: string): Promise<Map<string, RecordRef>> {
    try {
      const rows = await this.getDbContext()
        .select({
          ref: importRefs.externalRef,
          kind: importRefs.recordKind,
          id: importRefs.recordId,
        })
        .from(importRefs)
        .where(eq(importRefs.ownerId, ownerId));
      return new Map(rows.map(({ ref, kind, id }) => [ref, { kind, id }]));
    } catch (err) {
      this.handleError(err, "list", { ownerId });
    }
  }

  async add(
    ownerId: string,
    ref: string,
    record: RecordRef,
    tx: ITransaction,
  ): Promise<void> {
    try {
      // The unique index refuses a ref already written, so a record lands once.
      await this.getDbContext(tx).insert(importRefs).values({
        ownerId,
        externalRef: ref,
        recordKind: record.kind,
        recordId: record.id,
      });
    } catch (err) {
      this.handleError(err, "add", { ownerId, recordId: record.id });
    }
  }
}
