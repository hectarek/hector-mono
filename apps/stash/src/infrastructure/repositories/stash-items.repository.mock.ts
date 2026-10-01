import type { IStashItemsRepository } from "@/src/application/repositories/stash-items.repository.interface";
import type {
  StashItem,
  StashItemInsert,
} from "@/src/entities/models/stash-item.model";

export class MockStashItemsRepository implements IStashItemsRepository {
  private items: StashItem[] = [];

  async create(item: StashItemInsert, position: number): Promise<StashItem> {
    const created: StashItem = {
      id: crypto.randomUUID(),
      userId: item.userId,
      url: item.url,
      title: item.title,
      description: item.description ?? null,
      type: item.type ?? "other",
      status: "queued",
      position,
      thumbnailUrl: item.thumbnailUrl ?? null,
      source: item.source ?? null,
      createdAt: new Date(),
      completedAt: null,
    };

    this.items.push(created);
    return created;
  }

  async getForUser(userId: string): Promise<StashItem[]> {
    return this.items
      .filter((item) => item.userId === userId)
      .sort((a, b) => a.position - b.position);
  }

  async getById(id: string): Promise<StashItem | undefined> {
    return this.items.find((item) => item.id === id);
  }

  async update(id: string, data: Partial<StashItem>): Promise<StashItem> {
    const index = this.items.findIndex((item) => item.id === id);
    const existing = this.items[index];
    if (!existing) throw new Error(`Item at index ${index} not found`);
    const updated = { ...existing, ...data };
    this.items[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id !== id);
  }

  async getMaxPosition(userId: string): Promise<number> {
    const userItems = this.items.filter((item) => item.userId === userId);
    if (userItems.length === 0) return -1;
    return Math.max(...userItems.map((item) => item.position));
  }
}
