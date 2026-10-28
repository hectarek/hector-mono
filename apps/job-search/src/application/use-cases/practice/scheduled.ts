import type {
  PracticeSession,
  PracticeSessionRecord,
} from "@/src/entities/models/practice-entry.model";
import { nextReview } from "@/src/entities/practice-ladder";

// A session with its next review (R11), worked out from its tries each time and never stored, as
// a person's dates are (docs/build-plan.md KTD9).
export function scheduled(session: PracticeSessionRecord): PracticeSession {
  return { ...session, nextReview: nextReview(session) };
}
