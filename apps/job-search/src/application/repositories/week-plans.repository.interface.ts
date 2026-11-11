import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { WeekPlan } from "@/src/entities/models/weekly-review.model";

// An owner's week plans (docs/build-plan.md U20, R10 as revised 2026-11-10), one per week. Every
// method takes the owner's id (KTD2).
export interface IWeekPlansRepository {
  // The week's plan, by its Monday, or undefined before planning first sets its milestone.
  get(
    ownerId: string,
    week: string,
    tx?: ITransaction,
  ): Promise<WeekPlan | undefined>;
  // The same, read for a change: the row stays locked until the transaction ends.
  getForUpdate(
    ownerId: string,
    week: string,
    tx: ITransaction,
  ): Promise<WeekPlan | undefined>;
  // The week's first milestone: a second plan for the same week fails.
  create(
    ownerId: string,
    plan: Pick<WeekPlan, "week" | "milestone">,
    tx: ITransaction,
  ): Promise<WeekPlan>;
  // A later one: the milestone, and updatedAt moved on.
  update(
    ownerId: string,
    id: string,
    milestone: string | null,
    tx: ITransaction,
  ): Promise<WeekPlan>;
}
