import type {
  ActivityEvent,
  ActivityType,
  NewActivity,
} from "@/src/entities/models/activity-event.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// What people do in the app (docs/ux-plan.md D106). Write through `recordActivity`, which
// applies a kind's repeat rule, never `add` directly.
export interface IActivityEventsRepository {
  // Records the event now, or just after this person's newest one, so theirs keep their order.
  add(event: NewActivity, tx?: ITransaction): Promise<void>;
  // This person's newest event of a kind, if any.
  latest(
    userId: string,
    type: ActivityType,
    tx?: ITransaction,
  ): Promise<ActivityEvent | null>;
  // The recipes this person's events of a kind are about, each once, the most recent first.
  recentRecipeIds(
    userId: string,
    type: ActivityType,
    tx?: ITransaction,
  ): Promise<string[]>;
}
