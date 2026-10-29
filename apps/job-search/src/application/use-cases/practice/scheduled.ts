import { byCodePoint } from "@/src/entities/code-point-order";
import type {
  DueSession,
  PracticeSession,
  PracticeSessionRecord,
} from "@/src/entities/models/practice-entry.model";
import { nextReview } from "@/src/entities/practice-ladder";

// A session with its next review (R11), worked out from its tries each time and never stored, as
// a person's dates are (docs/build-plan.md KTD9).
export function scheduled(session: PracticeSessionRecord): PracticeSession {
  return { ...session, nextReview: nextReview(session) };
}

// The open sessions whose next review is due by the day given, the earliest due first, then by
// problem: the practice page's and This week's reviews due.
export function dueBy(
  open: PracticeSessionRecord[],
  day: string,
): DueSession[] {
  return open
    .map(scheduled)
    .filter(
      (session: PracticeSession): session is DueSession =>
        session.nextReview !== null && session.nextReview.dueOn <= day,
    )
    .sort(
      (a, b) =>
        byCodePoint(a.nextReview.dueOn, b.nextReview.dueOn) ||
        byCodePoint(a.topic, b.topic),
    );
}
