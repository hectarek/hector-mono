import type {
  NewPlanEntry,
  PlanEntry,
} from "@/src/entities/models/plan-entry.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export interface IPlanEntriesRepository {
  // Meals cooked or eaten on a day from `from` to `to`, in order of cook day, then when they
  // were added: a Sunday cook eaten on Monday is in both weeks.
  listForRange(spaceId: string, from: string, to: string): Promise<PlanEntry[]>;
  // Meals with a recipe that aren't cooked and haven't been added to the list, cooking from
  // `from` through `to` (no end when null), in cook-day order (D41, D44).
  listNotAdded(
    spaceId: string,
    cookDays: { from: string; to: string | null },
    tx?: ITransaction,
  ): Promise<PlanEntry[]>;
  // The recipes of meals added to the list and still to cook: not cooked, cooking on `from`
  // or later (D45). An older meal's items were bought, so they say nothing about the list now.
  addedRecipeIds(
    spaceId: string,
    from: string,
    tx?: ITransaction,
  ): Promise<string[]>;
  // Whether the plan has any meal on any day.
  hasEntries(spaceId: string, tx?: ITransaction): Promise<boolean>;
  getById(id: string, tx?: ITransaction): Promise<PlanEntry | undefined>;
  create(entry: NewPlanEntry, createdBy: string): Promise<PlanEntry>;
  setCooked(id: string, cooked: boolean): Promise<void>;
  setDays(id: string, cookDate: string, eatDates: string[]): Promise<void>;
  markAddedToList(ids: string[], at: Date, tx?: ITransaction): Promise<void>;
  delete(id: string): Promise<void>;
}
