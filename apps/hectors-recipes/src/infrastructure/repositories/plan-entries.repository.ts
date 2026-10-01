import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { planEntries } from "@/db/schema";
import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  NewPlanEntry,
  PlanEntry,
} from "@/src/entities/models/plan-entry.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

const entryColumns = {
  id: planEntries.id,
  spaceId: planEntries.spaceId,
  cookDate: planEntries.cookDate,
  eatDates: planEntries.eatDates,
  title: planEntries.title,
  recipeId: planEntries.recipeId,
  cooked: planEntries.cooked,
  addedToListAt: planEntries.addedToListAt,
  createdBy: planEntries.createdBy,
  createdAt: planEntries.createdAt,
};

export class PlanEntriesRepository
  extends BaseRepository
  implements IPlanEntriesRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "plan-entries");
  }

  async hasEntries(spaceId: string, tx?: ITransaction): Promise<boolean> {
    try {
      const [entry] = await this.getDbContext(tx)
        .select({ id: planEntries.id })
        .from(planEntries)
        .where(eq(planEntries.spaceId, spaceId))
        .limit(1);
      return !!entry;
    } catch (err) {
      this.handleError(err, "hasEntries", { spaceId });
    }
  }

  async listForRange(
    spaceId: string,
    from: string,
    to: string,
  ): Promise<PlanEntry[]> {
    try {
      const rows = await this.getDbContext()
        .select(entryColumns)
        .from(planEntries)
        .where(
          and(
            eq(planEntries.spaceId, spaceId),
            or(
              and(
                gte(planEntries.cookDate, from),
                lte(planEntries.cookDate, to),
              ),
              sql`exists (select 1 from unnest(${planEntries.eatDates}) as eat(day) where eat.day between ${from} and ${to})`,
            ),
          ),
        )
        .orderBy(asc(planEntries.cookDate), asc(planEntries.createdAt));
      return rows;
    } catch (err) {
      this.handleError(err, "listForRange", { spaceId, from, to });
    }
  }

  async listNotAdded(
    spaceId: string,
    { from, to }: { from: string; to: string | null },
    tx?: ITransaction,
  ): Promise<PlanEntry[]> {
    try {
      const rows = await this.getDbContext(tx)
        .select(entryColumns)
        .from(planEntries)
        .where(
          and(
            eq(planEntries.spaceId, spaceId),
            isNotNull(planEntries.recipeId),
            eq(planEntries.cooked, false),
            isNull(planEntries.addedToListAt),
            gte(planEntries.cookDate, from),
            to === null ? undefined : lte(planEntries.cookDate, to),
          ),
        )
        .orderBy(asc(planEntries.cookDate), asc(planEntries.createdAt));
      return rows;
    } catch (err) {
      this.handleError(err, "listNotAdded", { spaceId, from, to });
    }
  }

  async addedRecipeIds(
    spaceId: string,
    from: string,
    tx?: ITransaction,
  ): Promise<string[]> {
    try {
      const rows = await this.getDbContext(tx)
        .selectDistinct({ recipeId: planEntries.recipeId })
        .from(planEntries)
        .where(
          and(
            eq(planEntries.spaceId, spaceId),
            isNotNull(planEntries.recipeId),
            isNotNull(planEntries.addedToListAt),
            eq(planEntries.cooked, false),
            gte(planEntries.cookDate, from),
          ),
        );
      return rows.flatMap(({ recipeId }) => recipeId ?? []);
    } catch (err) {
      this.handleError(err, "addedRecipeIds", { spaceId });
    }
  }

  async getById(id: string, tx?: ITransaction): Promise<PlanEntry | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select(entryColumns)
        .from(planEntries)
        .where(eq(planEntries.id, id));
      return row;
    } catch (err) {
      this.handleError(err, "getById", { id });
    }
  }

  async create(entry: NewPlanEntry, createdBy: string): Promise<PlanEntry> {
    try {
      const [created] = await this.getDbContext()
        .insert(planEntries)
        .values({ ...entry, createdBy })
        .returning(entryColumns);
      if (!created) {
        throw new DatabaseOperationError("Failed to add plan entry");
      }
      return created;
    } catch (err) {
      this.handleError(err, "create", { spaceId: entry.spaceId });
    }
  }

  async setCooked(id: string, cooked: boolean): Promise<void> {
    try {
      await this.getDbContext()
        .update(planEntries)
        .set({ cooked, updatedAt: new Date() })
        .where(eq(planEntries.id, id));
    } catch (err) {
      this.handleError(err, "setCooked", { id });
    }
  }

  async setDays(
    id: string,
    cookDate: string,
    eatDates: string[],
  ): Promise<void> {
    try {
      await this.getDbContext()
        .update(planEntries)
        .set({ cookDate, eatDates, updatedAt: new Date() })
        .where(eq(planEntries.id, id));
    } catch (err) {
      this.handleError(err, "setDays", { id });
    }
  }

  async markAddedToList(
    ids: string[],
    at: Date,
    tx?: ITransaction,
  ): Promise<void> {
    if (!ids.length) return;
    try {
      await this.getDbContext(tx)
        .update(planEntries)
        .set({ addedToListAt: at })
        .where(inArray(planEntries.id, ids));
    } catch (err) {
      this.handleError(err, "markAddedToList", { count: ids.length });
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.getDbContext()
        .delete(planEntries)
        .where(eq(planEntries.id, id));
    } catch (err) {
      this.handleError(err, "delete", { id });
    }
  }
}
