import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import {
  type AddedSource,
  type LeadSource,
  sourceNameKey,
} from "@/src/entities/models/lead-source.model";

// The lead sources in memory. Like the table, each name once per owner, listed by name key and
// then id, by code point.
export class MockLeadSourcesRepository implements ILeadSourcesRepository {
  private readonly rows: { ownerId: string; source: LeadSource }[] = [];

  async add(ownerId: string, name: string): Promise<AddedSource> {
    const listed = this.rows.find(
      (row) =>
        row.ownerId === ownerId &&
        sourceNameKey(row.source.name) === sourceNameKey(name),
    );
    if (listed) {
      return { source: { ...listed.source }, created: false };
    }
    const source = { id: crypto.randomUUID(), name };
    this.rows.push({ ownerId, source });
    return { source: { ...source }, created: true };
  }

  async list(ownerId: string): Promise<LeadSource[]> {
    return this.rows
      .filter((row) => row.ownerId === ownerId)
      .map(({ source }) => ({ ...source }))
      .sort((a, b) => {
        const [keyA, keyB] = [sourceNameKey(a.name), sourceNameKey(b.name)];
        if (keyA !== keyB) {
          return keyA < keyB ? -1 : 1;
        }
        return a.id < b.id ? -1 : 1;
      });
  }
}
