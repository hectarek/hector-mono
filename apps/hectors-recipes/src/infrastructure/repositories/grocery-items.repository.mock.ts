import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { GroceryChanges } from "@/src/entities/grocery-merge";
import type { GroceryItem } from "@/src/entities/models/grocery-item.model";

export class MockGroceryItemsRepository implements IGroceryItemsRepository {
  private items: GroceryItem[] = [];
  private sequence = 0;

  async list(spaceId: string): Promise<GroceryItem[]> {
    return this.items.filter((item) => item.spaceId === spaceId);
  }

  async getById(id: string): Promise<GroceryItem | undefined> {
    return this.items.find((item) => item.id === id);
  }

  async addText(spaceId: string, text: string): Promise<void> {
    this.push(spaceId, {
      text,
      quantity: null,
      unit: null,
      ingredientId: null,
      sourceNote: null,
    });
  }

  async applyChanges(spaceId: string, changes: GroceryChanges): Promise<void> {
    for (const item of changes.inserts) {
      this.push(spaceId, item);
    }
    for (const update of changes.updates) {
      this.items = this.items.map((item) =>
        item.id === update.id ? { ...item, ...update } : item,
      );
    }
  }

  // One process, and each add runs to the end before the next: nothing to hold.
  async lockList(): Promise<void> {}

  async setChecked(id: string, checked: boolean): Promise<void> {
    this.items = this.items.map((item) =>
      item.id === id ? { ...item, checked } : item,
    );
  }

  async updateText(id: string, text: string): Promise<void> {
    this.items = this.items.map((item) =>
      item.id === id
        ? { ...item, text, quantity: null, unit: null, ingredientId: null }
        : item,
    );
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id !== id);
  }

  async deleteChecked(spaceId: string): Promise<number> {
    const before = this.items.length;
    this.items = this.items.filter(
      (item) => !(item.spaceId === spaceId && item.checked),
    );
    return before - this.items.length;
  }

  private push(spaceId: string, item: GroceryChanges["inserts"][number]): void {
    this.items.push({
      ...item,
      id: crypto.randomUUID(),
      spaceId,
      checked: false,
      createdAt: new Date(Date.now() + this.sequence++),
      // The mock has no catalog, so no aisles; the Postgres tests cover them.
      aisle: null,
    });
  }
}
