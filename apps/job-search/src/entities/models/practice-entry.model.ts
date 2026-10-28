import { z } from "zod";
import {
  type NextReview,
  PRACTICE_RESULTS,
  type PracticeResult,
} from "../practice-ladder";
import type { ChangeActor } from "./activity.model";
import { dateSchema, optionalText, requiredText } from "./input.model";

// What an entry in the practice log is (R11): a session, the first try at a problem or topic, or
// a review, a later try at a session's problem.
export const PRACTICE_KINDS = ["session", "review"] as const;
export type PracticeKind = (typeof PRACTICE_KINDS)[number];

// What every try keeps.
type PracticeTry = {
  id: string;
  // The day it happened, "YYYY-MM-DD" in Eastern time (KTD18).
  practicedOn: string;
  result: PracticeResult;
  aiUsed: boolean;
  minutes: number | null;
  notes: string | null;
  author: ChangeActor;
  createdAt: Date;
};

// A review of a session (R11).
export type PracticeReview = PracticeTry & { sessionId: string };

// A session as it's stored: its problem or topic, its type and pattern, and its reviews in the
// order they happened.
export type PracticeSessionRecord = PracticeTry & {
  topic: string;
  type: string | null;
  pattern: string | null;
  reviews: PracticeReview[];
};

// A session as the screens and tools read it: its next review (R11) is worked out from its tries
// each time and never stored, as a person's dates are (KTD9). Null once its reviews are done.
export type PracticeSession = PracticeSessionRecord & {
  nextReview: NextReview | null;
};

// A session and a review as the history records them.
export function sessionLogged({
  id,
  author,
  createdAt,
  reviews,
  ...rest
}: PracticeSessionRecord): Record<string, unknown> {
  return rest;
}

export function reviewLogged({
  id,
  author,
  createdAt,
  sessionId,
  ...rest
}: PracticeReview): Record<string, unknown> {
  return rest;
}

// What a try is given, a session's or a review's. A day not given is today.
type TryRequest = {
  practicedOn: string | undefined;
  result: PracticeResult;
  aiUsed: boolean;
  minutes: number | null;
  notes: string | null;
};

// What log_practice asks for, once read: a new session, or a review of one.
export type LogPracticeRequest =
  | ({
      kind: "session";
      topic: string;
      type: string | null;
      pattern: string | null;
    } & TryRequest)
  | ({ kind: "review"; sessionId: string } & TryRequest);

// log_practice's input (R11, docs/build-plan.md U8). Without a sessionId: a new session, with its
// problem or topic, on a day (today by default). With one: that session's next review, which takes
// its problem, type and pattern from the session.
export const logPracticeSchema = z
  .object({
    sessionId: z.uuid().optional(),
    topic: requiredText(200, "Name the problem or topic").optional(),
    type: optionalText(60).optional(),
    pattern: optionalText(60).optional(),
    practicedOn: dateSchema.optional(),
    result: z.enum(PRACTICE_RESULTS, {
      error: `Use one of: ${PRACTICE_RESULTS.join(", ")}`,
    }),
    aiUsed: z.boolean({ error: "Say yes or no" }).optional(),
    minutes: z
      .int({ error: "Use a whole number of minutes" })
      .min(1, { error: "At least 1 minute" })
      .max(600, { error: "At most 600 minutes" })
      .nullable()
      .optional(),
    notes: optionalText(2000).optional(),
  })
  .superRefine((input, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (input.sessionId !== undefined) {
      for (const field of ["topic", "type", "pattern"] as const) {
        if (input[field] !== undefined) {
          issue(field, "Leave this out of a review: it's the session's");
        }
      }
      return;
    }
    if (input.topic === undefined) {
      issue("topic", "Name the problem or topic");
    }
  })
  .transform((input): LogPracticeRequest => {
    const tried: TryRequest = {
      practicedOn: input.practicedOn,
      result: input.result,
      aiUsed: input.aiUsed ?? false,
      minutes: input.minutes ?? null,
      notes: input.notes ?? null,
    };
    if (input.sessionId !== undefined) {
      return { kind: "review", sessionId: input.sessionId, ...tried };
    }
    return {
      kind: "session",
      // Checked above: a session names its problem or topic.
      topic: input.topic ?? "",
      type: input.type ?? null,
      pattern: input.pattern ?? null,
      ...tried,
    };
  });

// What a log answers: the session as it stands after it, with its next review.
export type LoggedPractice = { session: PracticeSession };

// The most recent sessions a page of the log holds.
const PRACTICE_RECENT_MAX = 50;

// list_practice's input: how many of the latest sessions to list beside the due reviews.
export const listPracticeSchema = z.object({
  limit: z.int().min(1).max(PRACTICE_RECENT_MAX).default(20),
});

// A session whose next review is due.
export type DueSession = PracticeSession & { nextReview: NextReview };

// What list_practice answers (R11): today in Eastern time, the sessions whose next review is due
// by then, the earliest due first, and the latest sessions, the newest first.
export type PracticePage = {
  today: string;
  due: DueSession[];
  recent: PracticeSession[];
};

// Reading or deleting an entry's input: which session or review.
export const practiceEntryIdSchema = z.object({ id: z.uuid() });

// What a delete answers: the entry, and the session it belonged to, its own id for a session.
export type DeletedPracticeEntry = {
  id: string;
  kind: PracticeKind;
  sessionId: string;
};
