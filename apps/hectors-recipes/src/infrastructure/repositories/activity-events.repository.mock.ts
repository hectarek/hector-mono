import type { IActivityEventsRepository } from "@/src/application/repositories/activity-events.repository.interface";
import type {
  ActivityEvent,
  ActivityType,
  NewActivity,
} from "@/src/entities/models/activity-event.model";

export class MockActivityEventsRepository implements IActivityEventsRepository {
  // Every event, oldest first.
  private events: ActivityEvent[] = [];

  async add(event: NewActivity): Promise<void> {
    // Now, or just after this person's newest event, as the table's insert does.
    const newest = this.events
      .filter((existing) => existing.userId === event.userId)
      .reduce((at, existing) => Math.max(at, existing.occurredAt.getTime()), 0);
    this.events.push({
      ...event,
      id: crypto.randomUUID(),
      occurredAt: new Date(Math.max(Date.now(), newest + 1)),
    });
  }

  async latest(
    userId: string,
    type: ActivityType,
  ): Promise<ActivityEvent | null> {
    return this.mine(userId, type).at(-1) ?? null;
  }

  async recentRecipeIds(userId: string, type: ActivityType): Promise<string[]> {
    const ids: string[] = [];
    for (const event of this.mine(userId, type).reverse()) {
      if (event.recipeId && !ids.includes(event.recipeId)) {
        ids.push(event.recipeId);
      }
    }
    return ids;
  }

  // A deleted recipe's events go with it, as the table's cascade does.
  forgetRecipe(recipeId: string): void {
    this.events = this.events.filter((event) => event.recipeId !== recipeId);
  }

  private mine(userId: string, type: ActivityType): ActivityEvent[] {
    return this.events.filter(
      (event) => event.userId === userId && event.type === type,
    );
  }
}
