import { and, asc, between, desc, eq, inArray, sql } from "drizzle-orm";
import { interactions } from "@/db/schema";
import type {
  IInteractionsRepository,
  NewInteraction,
} from "@/src/application/repositories/interactions.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  ConversationState,
  Interaction,
} from "@/src/entities/models/interaction.model";
import type { PersonDates } from "@/src/entities/models/person.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { WeeklyCounts } from "@/src/entities/weekly-counts";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

// The latest day an interaction of a kind happened, as "YYYY-MM-DD" text (KTD9).
const latest = (condition: ReturnType<typeof sql>) =>
  sql<
    string | null
  >`(max(${interactions.occurredOn}) filter (where ${condition}))::text`;

export class InteractionsRepository
  extends BaseRepository
  implements IInteractionsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "interactions");
  }

  async add(
    ownerId: string,
    interaction: NewInteraction,
    tx: ITransaction,
  ): Promise<Interaction> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(interactions)
        .values({ ownerId, ...interaction })
        .returning();
      if (!row) {
        throw new DatabaseOperationError("add returned no interaction");
      }
      return toInteraction(row);
    } catch (err) {
      this.handleError(err, "add", {
        ownerId,
        personId: interaction.personId,
      });
    }
  }

  async getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<Interaction | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(interactions)
        .where(and(eq(interactions.ownerId, ownerId), eq(interactions.id, id)))
        .for("update");
      return row && toInteraction(row);
    } catch (err) {
      this.handleError(err, "getForUpdate", { ownerId, interactionId: id });
    }
  }

  async setOutcome(
    ownerId: string,
    id: string,
    { state, note }: { state: ConversationState; note?: string | null },
    tx: ITransaction,
  ): Promise<Interaction> {
    try {
      const [row] = await this.getDbContext(tx)
        .update(interactions)
        .set({ state, ...(note !== undefined && { note }) })
        .where(and(eq(interactions.ownerId, ownerId), eq(interactions.id, id)))
        .returning();
      if (!row) {
        throw new DatabaseOperationError("setOutcome found no interaction");
      }
      return toInteraction(row);
    } catch (err) {
      this.handleError(err, "setOutcome", { ownerId, interactionId: id });
    }
  }

  async delete(ownerId: string, id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(interactions)
        .where(and(eq(interactions.ownerId, ownerId), eq(interactions.id, id)));
    } catch (err) {
      this.handleError(err, "delete", { ownerId, interactionId: id });
    }
  }

  async listForPerson(
    ownerId: string,
    personId: string,
    tx?: ITransaction,
  ): Promise<Interaction[]> {
    try {
      const rows = await this.getDbContext(tx)
        .select()
        .from(interactions)
        .where(
          and(
            eq(interactions.ownerId, ownerId),
            eq(interactions.personId, personId),
          ),
        )
        .orderBy(
          desc(interactions.occurredOn),
          desc(interactions.createdAt),
          desc(interactions.id),
        );
      return rows.map(toInteraction);
    } catch (err) {
      this.handleError(err, "listForPerson", { ownerId, personId });
    }
  }

  async datesFor(
    ownerId: string,
    personIds: string[],
    tx?: ITransaction,
  ): Promise<Map<string, PersonDates>> {
    if (personIds.length === 0) {
      return new Map();
    }
    try {
      const rows = await this.getDbContext(tx)
        .select({
          personId: interactions.personId,
          messagedOn: latest(sql`${interactions.kind} = 'message-sent'`),
          repliedOn: latest(sql`${interactions.kind} = 'reply-received'`),
          metOn: latest(
            sql`${interactions.kind} = 'conversation' and ${interactions.state} = 'held'`,
          ),
        })
        .from(interactions)
        .where(
          and(
            eq(interactions.ownerId, ownerId),
            inArray(interactions.personId, personIds),
          ),
        )
        .groupBy(interactions.personId);
      return new Map(rows.map(({ personId, ...dates }) => [personId, dates]));
    } catch (err) {
      this.handleError(err, "datesFor", { ownerId });
    }
  }

  async repliedOnFor(ownerId: string, jobId: string): Promise<string | null> {
    try {
      const [row] = await this.getDbContext()
        .select({ repliedOn: latest(sql`true`) })
        .from(interactions)
        .where(
          and(
            eq(interactions.ownerId, ownerId),
            eq(interactions.jobId, jobId),
            eq(interactions.kind, "reply-received"),
          ),
        );
      return row?.repliedOn ?? null;
    } catch (err) {
      this.handleError(err, "repliedOnFor", { ownerId, jobId });
    }
  }

  async listScheduled(ownerId: string): Promise<Interaction[]> {
    try {
      const rows = await this.getDbContext()
        .select()
        .from(interactions)
        .where(
          and(
            eq(interactions.ownerId, ownerId),
            eq(interactions.state, "scheduled"),
          ),
        )
        .orderBy(asc(interactions.startsAt), asc(interactions.id));
      return rows.map(toInteraction);
    } catch (err) {
      this.handleError(err, "listScheduled", { ownerId });
    }
  }

  async countInRange(
    ownerId: string,
    from: string,
    to: string,
  ): Promise<Pick<WeeklyCounts, "messagesSent" | "conversationsHeld">> {
    try {
      const [row] = await this.getDbContext()
        .select({
          messagesSent: sql<number>`(count(*) filter (where ${interactions.kind} = 'message-sent'))::int`,
          conversationsHeld: sql<number>`(count(*) filter (where ${interactions.kind} = 'conversation' and ${interactions.state} = 'held'))::int`,
        })
        .from(interactions)
        .where(
          and(
            eq(interactions.ownerId, ownerId),
            between(interactions.occurredOn, from, to),
          ),
        );
      return {
        messagesSent: row?.messagesSent ?? 0,
        conversationsHeld: row?.conversationsHeld ?? 0,
      };
    } catch (err) {
      this.handleError(err, "countInRange", { ownerId });
    }
  }

  async deleteForPerson(
    ownerId: string,
    personId: string,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(interactions)
        .where(
          and(
            eq(interactions.ownerId, ownerId),
            eq(interactions.personId, personId),
          ),
        );
    } catch (err) {
      this.handleError(err, "deleteForPerson", { ownerId, personId });
    }
  }

  async unlinkJob(
    ownerId: string,
    jobId: string,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(interactions)
        .set({ jobId: null })
        .where(
          and(eq(interactions.ownerId, ownerId), eq(interactions.jobId, jobId)),
        );
    } catch (err) {
      this.handleError(err, "unlinkJob", { ownerId, jobId });
    }
  }
}

function toInteraction(row: typeof interactions.$inferSelect): Interaction {
  return {
    id: row.id,
    personId: row.personId,
    kind: row.kind,
    occurredOn: row.occurredOn,
    jobId: row.jobId,
    note: row.note,
    state: row.state,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    author: row.author,
    createdAt: row.createdAt,
  };
}
