import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { WeeklyReview } from "@/src/entities/models/weekly-review.model";

// A review as its first save writes it.
export type NewWeeklyReview = Omit<
  WeeklyReview,
  "id" | "createdAt" | "updatedAt"
>;

// An owner's weekly reviews (docs/build-plan.md U9, R10), one per week. Every method takes the
// owner's id (KTD2).
export interface IWeeklyReviewsRepository {
  // The week's review, by its Monday, or undefined before its first save.
  get(
    ownerId: string,
    week: string,
    tx?: ITransaction,
  ): Promise<WeeklyReview | undefined>;
  // The same, read for a change: the row stays locked until the transaction ends.
  getForUpdate(
    ownerId: string,
    week: string,
    tx: ITransaction,
  ): Promise<WeeklyReview | undefined>;
  // The first save: a second for the same week fails.
  create(
    ownerId: string,
    review: NewWeeklyReview,
    tx: ITransaction,
  ): Promise<WeeklyReview>;
  // A later save: the milestone and the change given, and updatedAt moved on.
  update(
    ownerId: string,
    id: string,
    changes: Partial<Pick<WeeklyReview, "milestone" | "change">>,
    tx: ITransaction,
  ): Promise<WeeklyReview>;
}
