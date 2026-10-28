import type {
  PracticeReview,
  PracticeSessionRecord,
} from "@/src/entities/models/practice-entry.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// A session and a review as they're written.
export type NewPracticeSession = Omit<
  PracticeSessionRecord,
  "id" | "createdAt" | "reviews"
>;
export type NewPracticeReview = Omit<PracticeReview, "id" | "createdAt">;

// An owner's practice log (docs/build-plan.md U8, R11): sessions, each with its reviews in the
// order they happened (the day, then when each was logged). Every method takes the owner's id
// (KTD2).
export interface IPracticeRepository {
  addSession(
    ownerId: string,
    session: NewPracticeSession,
    tx: ITransaction,
  ): Promise<PracticeSessionRecord>;
  addReview(
    ownerId: string,
    review: NewPracticeReview,
    tx: ITransaction,
  ): Promise<PracticeReview>;
  getSession(
    ownerId: string,
    id: string,
  ): Promise<PracticeSessionRecord | undefined>;
  // The session, read for a change: it stays locked until the transaction ends, so two reviews of
  // it settle one at a time.
  getSessionForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<PracticeSessionRecord | undefined>;
  getReviewForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<PracticeReview | undefined>;
  // A session's delete takes its reviews with it.
  delete(ownerId: string, id: string, tx: ITransaction): Promise<void>;
  // The sessions still on the ladder: fewer than LADDER_STEPS solved reviews (R11).
  listOpen(ownerId: string): Promise<PracticeSessionRecord[]>;
  // The latest sessions: the latest day first, then the latest logged.
  listRecent(ownerId: string, limit: number): Promise<PracticeSessionRecord[]>;
}
