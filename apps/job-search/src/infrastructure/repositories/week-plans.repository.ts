import { and, eq } from "drizzle-orm";
import { weekPlans } from "@/db/schema";
import type { IWeekPlansRepository } from "@/src/application/repositories/week-plans.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { WeekPlan } from "@/src/entities/models/weekly-review.model";
import {
  BaseRepository,
  nextUpdatedAt,
} from "@/src/infrastructure/repositories/base.repository";

type Row = typeof weekPlans.$inferSelect;

export class WeekPlansRepository
  extends BaseRepository
  implements IWeekPlansRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "week-plans");
  }

  async get(
    ownerId: string,
    week: string,
    tx?: ITransaction,
  ): Promise<WeekPlan | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(weekPlans)
        .where(this.weekOf(ownerId, week));
      return row && toPlan(row);
    } catch (err) {
      this.handleError(err, "get", { ownerId });
    }
  }

  async getForUpdate(
    ownerId: string,
    week: string,
    tx: ITransaction,
  ): Promise<WeekPlan | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(weekPlans)
        .where(this.weekOf(ownerId, week))
        .for("update");
      return row && toPlan(row);
    } catch (err) {
      this.handleError(err, "getForUpdate", { ownerId });
    }
  }

  async create(
    ownerId: string,
    plan: Pick<WeekPlan, "week" | "milestone">,
    tx: ITransaction,
  ): Promise<WeekPlan> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(weekPlans)
        .values({ ownerId, ...plan })
        .returning();
      if (!row) {
        throw new DatabaseOperationError("create returned no plan");
      }
      return toPlan(row);
    } catch (err) {
      this.handleError(err, "create", { ownerId });
    }
  }

  async update(
    ownerId: string,
    id: string,
    milestone: string | null,
    tx: ITransaction,
  ): Promise<WeekPlan> {
    try {
      const [row] = await this.getDbContext(tx)
        .update(weekPlans)
        .set({ milestone, updatedAt: nextUpdatedAt(weekPlans.updatedAt) })
        .where(and(eq(weekPlans.ownerId, ownerId), eq(weekPlans.id, id)))
        .returning();
      if (!row) {
        throw new DatabaseOperationError("update found no plan");
      }
      return toPlan(row);
    } catch (err) {
      this.handleError(err, "update", { ownerId, planId: id });
    }
  }

  private weekOf(ownerId: string, week: string) {
    return and(eq(weekPlans.ownerId, ownerId), eq(weekPlans.week, week));
  }
}

function toPlan({ ownerId, ...plan }: Row): WeekPlan {
  return plan;
}
