import type { IWeekPlansRepository } from "@/src/application/repositories/week-plans.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { WeekPlan } from "@/src/entities/models/weekly-review.model";
import { nextUpdatedAt } from "@/src/infrastructure/repositories/updated-at.mock";

// The week plans in memory. Like the table, a week holds one plan per owner, and each update moves
// updatedAt on by at least a millisecond.
export class MockWeekPlansRepository implements IWeekPlansRepository {
  private readonly rows: { ownerId: string; plan: WeekPlan }[] = [];

  async get(ownerId: string, week: string): Promise<WeekPlan | undefined> {
    const row = this.rows.find(
      (row) => row.ownerId === ownerId && row.plan.week === week,
    );
    return row && { ...row.plan };
  }

  async getForUpdate(
    ownerId: string,
    week: string,
  ): Promise<WeekPlan | undefined> {
    return this.get(ownerId, week);
  }

  async create(
    ownerId: string,
    plan: Pick<WeekPlan, "week" | "milestone">,
  ): Promise<WeekPlan> {
    if (await this.get(ownerId, plan.week)) {
      throw new DatabaseOperationError("create failed");
    }
    const now = new Date();
    const stored: WeekPlan = {
      ...plan,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push({ ownerId, plan: stored });
    return { ...stored };
  }

  async update(
    ownerId: string,
    id: string,
    milestone: string | null,
  ): Promise<WeekPlan> {
    const row = this.rows.find(
      (row) => row.ownerId === ownerId && row.plan.id === id,
    );
    if (!row) {
      throw new DatabaseOperationError("update found no plan");
    }
    row.plan = {
      ...row.plan,
      milestone,
      updatedAt: nextUpdatedAt(row.plan.updatedAt),
    };
    return { ...row.plan };
  }
}
