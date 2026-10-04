import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type {
  NewPlanEntry,
  PlanEntry,
} from "@/src/entities/models/plan-entry.model";

export class MockPlanEntriesRepository implements IPlanEntriesRepository {
  private entries: PlanEntry[] = [];

  async hasEntries(spaceId: string): Promise<boolean> {
    return this.entries.some((entry) => entry.spaceId === spaceId);
  }

  async listForRange(
    spaceId: string,
    from: string,
    to: string,
  ): Promise<PlanEntry[]> {
    const inRange = (date: string) => date >= from && date <= to;
    return this.entries
      .filter(
        (entry) =>
          entry.spaceId === spaceId &&
          (inRange(entry.cookDate) || entry.eatDates.some(inRange)),
      )
      .sort(
        (a, b) =>
          a.cookDate.localeCompare(b.cookDate) ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      );
  }

  async listNotAdded(
    spaceId: string,
    { from, to }: { from: string; to: string | null },
  ): Promise<PlanEntry[]> {
    return this.entries
      .filter(
        (entry) =>
          entry.spaceId === spaceId &&
          entry.recipeId !== null &&
          !entry.cooked &&
          entry.addedToListAt === null &&
          entry.cookDate >= from &&
          (to === null || entry.cookDate <= to),
      )
      .sort(
        (a, b) =>
          a.cookDate.localeCompare(b.cookDate) ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      );
  }

  async addedRecipeIds(spaceId: string, from: string): Promise<string[]> {
    return [
      ...new Set(
        this.entries.flatMap((entry) =>
          entry.spaceId === spaceId &&
          entry.addedToListAt !== null &&
          entry.recipeId !== null &&
          !entry.cooked &&
          entry.cookDate >= from
            ? [entry.recipeId]
            : [],
        ),
      ),
    ];
  }

  // What the database's "on delete set null" does when a recipe goes (the meal keeps its
  // title). The mock recipes repository calls it.
  unlinkRecipe(recipeId: string): void {
    this.entries = this.entries.map((entry) =>
      entry.recipeId === recipeId ? { ...entry, recipeId: null } : entry,
    );
  }

  async getById(id: string): Promise<PlanEntry | undefined> {
    return this.entries.find((entry) => entry.id === id);
  }

  async create(entry: NewPlanEntry, createdBy: string): Promise<PlanEntry> {
    const created: PlanEntry = {
      ...entry,
      id: crypto.randomUUID(),
      cooked: false,
      addedToListAt: null,
      createdBy,
      createdAt: new Date(),
    };
    this.entries.push(created);
    return created;
  }

  async setCooked(id: string, cooked: boolean): Promise<void> {
    this.entries = this.entries.map((entry) =>
      entry.id === id ? { ...entry, cooked } : entry,
    );
  }

  async setDays(
    id: string,
    cookDate: string,
    eatDates: string[],
  ): Promise<void> {
    this.entries = this.entries.map((entry) =>
      entry.id === id ? { ...entry, cookDate, eatDates } : entry,
    );
  }

  async markAddedToList(ids: string[], at: Date): Promise<void> {
    this.entries = this.entries.map((entry) =>
      ids.includes(entry.id) ? { ...entry, addedToListAt: at } : entry,
    );
  }

  async unmarkAddedToList(spaceId: string): Promise<void> {
    this.entries = this.entries.map((entry) =>
      entry.spaceId === spaceId ? { ...entry, addedToListAt: null } : entry,
    );
  }

  async delete(id: string): Promise<void> {
    this.entries = this.entries.filter((entry) => entry.id !== id);
  }
}
