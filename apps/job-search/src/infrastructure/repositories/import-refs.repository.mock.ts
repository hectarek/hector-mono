import type { IImportRefsRepository } from "@/src/application/repositories/import-refs.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { RecordRef } from "@/src/entities/models/activity.model";

// The import's refs in memory. Like the table's unique index, each ref once per owner.
export class MockImportRefsRepository implements IImportRefsRepository {
  private readonly rows = new Map<string, Map<string, RecordRef>>();

  async list(ownerId: string): Promise<Map<string, RecordRef>> {
    return new Map(this.rows.get(ownerId));
  }

  async add(ownerId: string, ref: string, record: RecordRef): Promise<void> {
    const refs = this.rows.get(ownerId) ?? new Map<string, RecordRef>();
    if (refs.has(ref)) {
      throw new DatabaseOperationError("add found the ref already written");
    }
    refs.set(ref, { ...record });
    this.rows.set(ownerId, refs);
  }
}
