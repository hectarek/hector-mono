import { and, eq } from "drizzle-orm";
import { weeklyReviews } from "@/db/schema";
import type {
  IWeeklyReviewsRepository,
  NewWeeklyReview,
} from "@/src/application/repositories/weekly-reviews.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { WeeklyReview } from "@/src/entities/models/weekly-review.model";
import {
  BaseRepository,
  nextUpdatedAt,
} from "@/src/infrastructure/repositories/base.repository";

type Row = typeof weeklyReviews.$inferSelect;

export class WeeklyReviewsRepository
  extends BaseRepository
  implements IWeeklyReviewsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "weekly-reviews");
  }

  async get(
    ownerId: string,
    week: string,
    tx?: ITransaction,
  ): Promise<WeeklyReview | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(weeklyReviews)
        .where(this.weekOf(ownerId, week));
      return row && toReview(row);
    } catch (err) {
      this.handleError(err, "get", { ownerId });
    }
  }

  async getForUpdate(
    ownerId: string,
    week: string,
    tx: ITransaction,
  ): Promise<WeeklyReview | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(weeklyReviews)
        .where(this.weekOf(ownerId, week))
        .for("update");
      return row && toReview(row);
    } catch (err) {
      this.handleError(err, "getForUpdate", { ownerId });
    }
  }

  async create(
    ownerId: string,
    review: NewWeeklyReview,
    tx: ITransaction,
  ): Promise<WeeklyReview> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(weeklyReviews)
        .values({ ownerId, ...review })
        .returning();
      if (!row) {
        throw new DatabaseOperationError("create returned no review");
      }
      return toReview(row);
    } catch (err) {
      this.handleError(err, "create", { ownerId });
    }
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<Pick<WeeklyReview, "milestone" | "change">>,
    tx: ITransaction,
  ): Promise<WeeklyReview> {
    try {
      const [row] = await this.getDbContext(tx)
        .update(weeklyReviews)
        .set({ ...changes, updatedAt: nextUpdatedAt(weeklyReviews.updatedAt) })
        .where(
          and(eq(weeklyReviews.ownerId, ownerId), eq(weeklyReviews.id, id)),
        )
        .returning();
      if (!row) {
        throw new DatabaseOperationError("update found no review");
      }
      return toReview(row);
    } catch (err) {
      this.handleError(err, "update", { ownerId, reviewId: id });
    }
  }

  private weekOf(ownerId: string, week: string) {
    return and(
      eq(weeklyReviews.ownerId, ownerId),
      eq(weeklyReviews.week, week),
    );
  }
}

function toReview({ ownerId, ...review }: Row): WeeklyReview {
  return review;
}
