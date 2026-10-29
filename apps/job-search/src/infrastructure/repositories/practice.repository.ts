import { and, asc, between, count, desc, eq, inArray, sql } from "drizzle-orm";
import { practiceEntries } from "@/db/schema";
import type {
  IPracticeRepository,
  NewPracticeReview,
  NewPracticeSession,
} from "@/src/application/repositories/practice.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  PracticeReview,
  PracticeSessionRecord,
} from "@/src/entities/models/practice-entry.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { LADDER_STEPS } from "@/src/entities/practice-ladder";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

type Row = typeof practiceEntries.$inferSelect;

// How many of a session's reviews were solved: the steps it has climbed (R11).
const solvedReviews = sql`(select count(*) from ${practiceEntries} as review where review.session_id = ${practiceEntries.id} and review.result = 'solved')`;

export class PracticeRepository
  extends BaseRepository
  implements IPracticeRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "practice");
  }

  async addSession(
    ownerId: string,
    session: NewPracticeSession,
    tx: ITransaction,
  ): Promise<PracticeSessionRecord> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(practiceEntries)
        .values({ ownerId, kind: "session", ...session })
        .returning();
      if (!row) {
        throw new DatabaseOperationError("addSession returned no session");
      }
      return toSession(row, []);
    } catch (err) {
      this.handleError(err, "addSession", { ownerId });
    }
  }

  async addReview(
    ownerId: string,
    review: NewPracticeReview,
    tx: ITransaction,
  ): Promise<PracticeReview> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(practiceEntries)
        .values({ ownerId, kind: "review", ...review })
        .returning();
      if (!row) {
        throw new DatabaseOperationError("addReview returned no review");
      }
      return toReview(row);
    } catch (err) {
      this.handleError(err, "addReview", {
        ownerId,
        sessionId: review.sessionId,
      });
    }
  }

  async getSession(
    ownerId: string,
    id: string,
  ): Promise<PracticeSessionRecord | undefined> {
    try {
      const [row] = await this.getDbContext()
        .select()
        .from(practiceEntries)
        .where(this.sessionIs(ownerId, id));
      return row && (await this.withReviews(ownerId, [row]))[0];
    } catch (err) {
      this.handleError(err, "getSession", { ownerId, sessionId: id });
    }
  }

  async getSessionForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<PracticeSessionRecord | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(practiceEntries)
        .where(this.sessionIs(ownerId, id))
        .for("update");
      return row && (await this.withReviews(ownerId, [row], tx))[0];
    } catch (err) {
      this.handleError(err, "getSessionForUpdate", { ownerId, sessionId: id });
    }
  }

  async getReviewForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<PracticeReview | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(practiceEntries)
        .where(
          and(
            eq(practiceEntries.ownerId, ownerId),
            eq(practiceEntries.id, id),
            eq(practiceEntries.kind, "review"),
          ),
        )
        .for("update");
      return row && toReview(row);
    } catch (err) {
      this.handleError(err, "getReviewForUpdate", { ownerId, reviewId: id });
    }
  }

  async delete(ownerId: string, id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(practiceEntries)
        .where(
          and(eq(practiceEntries.ownerId, ownerId), eq(practiceEntries.id, id)),
        );
    } catch (err) {
      this.handleError(err, "delete", { ownerId, entryId: id });
    }
  }

  async listOpen(ownerId: string): Promise<PracticeSessionRecord[]> {
    try {
      const rows = await this.getDbContext()
        .select()
        .from(practiceEntries)
        .where(
          and(
            eq(practiceEntries.ownerId, ownerId),
            eq(practiceEntries.kind, "session"),
            sql`${solvedReviews} < ${LADDER_STEPS}`,
          ),
        )
        .orderBy(
          asc(practiceEntries.practicedOn),
          asc(practiceEntries.createdAt),
          asc(practiceEntries.id),
        );
      return await this.withReviews(ownerId, rows);
    } catch (err) {
      this.handleError(err, "listOpen", { ownerId });
    }
  }

  async countSessions(
    ownerId: string,
    from: string,
    to: string,
  ): Promise<number> {
    try {
      const [row] = await this.getDbContext()
        .select({ sessions: count() })
        .from(practiceEntries)
        .where(
          and(
            eq(practiceEntries.ownerId, ownerId),
            eq(practiceEntries.kind, "session"),
            between(practiceEntries.practicedOn, from, to),
          ),
        );
      return row?.sessions ?? 0;
    } catch (err) {
      this.handleError(err, "countSessions", { ownerId });
    }
  }

  async listRecent(
    ownerId: string,
    limit: number,
  ): Promise<PracticeSessionRecord[]> {
    try {
      const rows = await this.getDbContext()
        .select()
        .from(practiceEntries)
        .where(
          and(
            eq(practiceEntries.ownerId, ownerId),
            eq(practiceEntries.kind, "session"),
          ),
        )
        .orderBy(
          desc(practiceEntries.practicedOn),
          desc(practiceEntries.createdAt),
          desc(practiceEntries.id),
        )
        .limit(limit);
      return await this.withReviews(ownerId, rows);
    } catch (err) {
      this.handleError(err, "listRecent", { ownerId });
    }
  }

  private sessionIs(ownerId: string, id: string) {
    return and(
      eq(practiceEntries.ownerId, ownerId),
      eq(practiceEntries.id, id),
      eq(practiceEntries.kind, "session"),
    );
  }

  // The sessions with their reviews, read in one query, in the order they happened.
  private async withReviews(
    ownerId: string,
    sessions: Row[],
    tx?: ITransaction,
  ): Promise<PracticeSessionRecord[]> {
    if (sessions.length === 0) {
      return [];
    }
    const rows = await this.getDbContext(tx)
      .select()
      .from(practiceEntries)
      .where(
        and(
          eq(practiceEntries.ownerId, ownerId),
          eq(practiceEntries.kind, "review"),
          inArray(
            practiceEntries.sessionId,
            sessions.map(({ id }) => id),
          ),
        ),
      )
      .orderBy(
        asc(practiceEntries.practicedOn),
        asc(practiceEntries.createdAt),
        asc(practiceEntries.id),
      );
    const reviews = new Map<string, PracticeReview[]>();
    for (const row of rows) {
      const review = toReview(row);
      reviews.set(review.sessionId, [
        ...(reviews.get(review.sessionId) ?? []),
        review,
      ]);
    }
    return sessions.map((row) => toSession(row, reviews.get(row.id) ?? []));
  }
}

// The table's checks hold a session's topic and a review's session, so neither is null here.
function toSession(row: Row, reviews: PracticeReview[]): PracticeSessionRecord {
  return {
    id: row.id,
    topic: row.topic ?? "",
    type: row.type,
    pattern: row.pattern,
    practicedOn: row.practicedOn,
    result: row.result,
    aiUsed: row.aiUsed,
    minutes: row.minutes,
    notes: row.notes,
    author: row.author,
    createdAt: row.createdAt,
    reviews,
  };
}

function toReview(row: Row): PracticeReview {
  return {
    id: row.id,
    sessionId: row.sessionId ?? "",
    practicedOn: row.practicedOn,
    result: row.result,
    aiUsed: row.aiUsed,
    minutes: row.minutes,
    notes: row.notes,
    author: row.author,
    createdAt: row.createdAt,
  };
}
