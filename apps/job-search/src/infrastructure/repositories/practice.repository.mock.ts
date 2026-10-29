import type {
  IPracticeRepository,
  NewPracticeReview,
  NewPracticeSession,
} from "@/src/application/repositories/practice.repository.interface";
import { byCodePoint } from "@/src/entities/code-point-order";
import type {
  PracticeReview,
  PracticeSessionRecord,
} from "@/src/entities/models/practice-entry.model";
import { LADDER_STEPS } from "@/src/entities/practice-ladder";

type SessionRow = {
  ownerId: string;
  session: Omit<PracticeSessionRecord, "reviews">;
  added: number;
};
type ReviewRow = { ownerId: string; review: PracticeReview; added: number };

// Two tries in the log's order: by day, then by when each was logged.
const inOrder = (
  a: { practicedOn: string; createdAt: Date },
  b: { practicedOn: string; createdAt: Date },
) =>
  byCodePoint(a.practicedOn, b.practicedOn) ||
  a.createdAt.getTime() - b.createdAt.getTime();

// The practice log in memory, in the table's orders: reviews as they happened, the open sessions
// the oldest first, the recent ones the latest first.
export class MockPracticeRepository implements IPracticeRepository {
  private readonly sessions: SessionRow[] = [];
  private readonly reviews: ReviewRow[] = [];
  private added = 0;

  async addSession(
    ownerId: string,
    session: NewPracticeSession,
  ): Promise<PracticeSessionRecord> {
    const stored = {
      ...session,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.added += 1;
    this.sessions.push({ ownerId, session: stored, added: this.added });
    return { ...stored, reviews: [] };
  }

  async addReview(
    ownerId: string,
    review: NewPracticeReview,
  ): Promise<PracticeReview> {
    const stored = {
      ...review,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.added += 1;
    this.reviews.push({ ownerId, review: stored, added: this.added });
    return { ...stored };
  }

  async getSession(
    ownerId: string,
    id: string,
  ): Promise<PracticeSessionRecord | undefined> {
    const row = this.sessions.find(
      (session) => session.ownerId === ownerId && session.session.id === id,
    );
    return row && this.withReviews(row);
  }

  async getSessionForUpdate(
    ownerId: string,
    id: string,
  ): Promise<PracticeSessionRecord | undefined> {
    return this.getSession(ownerId, id);
  }

  async getReviewForUpdate(
    ownerId: string,
    id: string,
  ): Promise<PracticeReview | undefined> {
    const row = this.reviews.find(
      (review) => review.ownerId === ownerId && review.review.id === id,
    );
    return row && { ...row.review };
  }

  async delete(ownerId: string, id: string): Promise<void> {
    remove(
      this.sessions,
      (row) => row.ownerId === ownerId && row.session.id === id,
    );
    remove(
      this.reviews,
      (row) =>
        row.ownerId === ownerId &&
        (row.review.id === id || row.review.sessionId === id),
    );
  }

  async listOpen(ownerId: string): Promise<PracticeSessionRecord[]> {
    return this.sessions
      .filter((row) => row.ownerId === ownerId)
      .sort((a, b) => inOrder(a.session, b.session) || a.added - b.added)
      .map((row) => this.withReviews(row))
      .filter(
        ({ reviews }) =>
          reviews.filter(({ result }) => result === "solved").length <
          LADDER_STEPS,
      );
  }

  async listRecent(
    ownerId: string,
    limit: number,
  ): Promise<PracticeSessionRecord[]> {
    return this.sessions
      .filter((row) => row.ownerId === ownerId)
      .sort((a, b) => inOrder(b.session, a.session) || b.added - a.added)
      .slice(0, limit)
      .map((row) => this.withReviews(row));
  }

  async countSessions(
    ownerId: string,
    from: string,
    to: string,
  ): Promise<number> {
    return this.sessions.filter(
      ({ ownerId: owner, session }) =>
        owner === ownerId &&
        session.practicedOn >= from &&
        session.practicedOn <= to,
    ).length;
  }

  private withReviews(row: SessionRow): PracticeSessionRecord {
    return {
      ...row.session,
      reviews: this.reviews
        .filter(
          (review) =>
            review.ownerId === row.ownerId &&
            review.review.sessionId === row.session.id,
        )
        .sort((a, b) => inOrder(a.review, b.review) || a.added - b.added)
        .map((review) => ({ ...review.review })),
    };
  }
}

function remove<Row>(rows: Row[], matches: (row: Row) => boolean): void {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (row !== undefined && matches(row)) {
      rows.splice(index, 1);
    }
  }
}
