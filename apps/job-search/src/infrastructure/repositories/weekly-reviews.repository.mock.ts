import type {
  IWeeklyReviewsRepository,
  NewWeeklyReview,
} from "@/src/application/repositories/weekly-reviews.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { WeeklyReview } from "@/src/entities/models/weekly-review.model";
import { nextUpdatedAt } from "@/src/infrastructure/repositories/updated-at.mock";

// The weekly reviews in memory. Like the table, a week holds one review per owner, and each update
// moves updatedAt on by at least a millisecond.
export class MockWeeklyReviewsRepository implements IWeeklyReviewsRepository {
  private readonly rows: { ownerId: string; review: WeeklyReview }[] = [];

  async get(ownerId: string, week: string): Promise<WeeklyReview | undefined> {
    const row = this.rows.find(
      (row) => row.ownerId === ownerId && row.review.week === week,
    );
    return row && copyOf(row.review);
  }

  async getForUpdate(
    ownerId: string,
    week: string,
  ): Promise<WeeklyReview | undefined> {
    return this.get(ownerId, week);
  }

  async create(
    ownerId: string,
    review: NewWeeklyReview,
  ): Promise<WeeklyReview> {
    if (await this.get(ownerId, review.week)) {
      throw new DatabaseOperationError("create failed");
    }
    const now = new Date();
    const stored: WeeklyReview = {
      ...copyOf({ ...review, id: "", createdAt: now, updatedAt: now }),
      id: crypto.randomUUID(),
    };
    this.rows.push({ ownerId, review: stored });
    return copyOf(stored);
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<Pick<WeeklyReview, "milestone" | "change">>,
  ): Promise<WeeklyReview> {
    const row = this.rows.find(
      (row) => row.ownerId === ownerId && row.review.id === id,
    );
    if (!row) {
      throw new DatabaseOperationError("update found no review");
    }
    row.review = {
      ...row.review,
      ...changes,
      updatedAt: nextUpdatedAt(row.review.updatedAt),
    };
    return copyOf(row.review);
  }
}

function copyOf(review: WeeklyReview): WeeklyReview {
  return {
    ...review,
    counts: { ...review.counts },
    targets: { ...review.targets },
  };
}
