import { z } from "zod";
import type { ChangeActor } from "./activity.model";
import { dateSchema, optionalText, timeSchema } from "./input.model";

// What an interaction is (R8, KTD9): a message Hector sent, a reply he got, or a conversation.
export const INTERACTION_KINDS = [
  "message-sent",
  "reply-received",
  "conversation",
] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

// Where a conversation stands: scheduled until it ends as held, cancelled or no-show. Only held
// ones count as conversations (R8).
export const CONVERSATION_STATES = [
  "scheduled",
  "held",
  "cancelled",
  "no-show",
] as const;
export type ConversationState = (typeof CONVERSATION_STATES)[number];

// How a scheduled conversation can end.
const CONVERSATION_OUTCOMES = ["held", "cancelled", "no-show"] as const;
type ConversationOutcome = (typeof CONVERSATION_OUTCOMES)[number];

// A dated event with a person (KTD9). The weekly counts and a person's dates read its day, never
// when it was logged.
export type Interaction = {
  id: string;
  personId: string;
  kind: InteractionKind;
  // The day it happened, "YYYY-MM-DD" in Eastern time (KTD18); a scheduled conversation's start.
  occurredOn: string;
  jobId: string | null;
  note: string | null;
  // A conversation's state and, when it was scheduled, its times. Null for a message.
  state: ConversationState | null;
  startsAt: Date | null;
  endsAt: Date | null;
  author: ChangeActor;
  createdAt: Date;
};

// An interaction as its history records it.
export function interactionLogged({
  id,
  author,
  createdAt,
  ...rest
}: Interaction): Record<string, unknown> {
  return rest;
}

// The most people one log names: a batch of sent messages (R8).
const BATCH_MAX = 20;

// A person's next step and date, which a log can set as it goes.
export type NextStep = { nextStep?: string | null; nextDate?: string | null };

// What log_interaction asks for, once read: new interactions, one per person, or how a scheduled
// conversation ended.
export type LogInteractionRequest =
  | {
      type: "log";
      personIds: string[];
      kind: InteractionKind;
      // Today when not given; a scheduled conversation's day comes from its start.
      occurredOn: string | undefined;
      jobId: string | undefined;
      note: string | null;
      scheduled: { startsAt: Date; endsAt: Date } | undefined;
      next: NextStep;
    }
  | {
      type: "outcome";
      conversationId: string;
      outcome: ConversationOutcome;
      note: string | null | undefined;
      next: NextStep;
    };

// log_interaction's input (KTD9). Without a conversationId: new interactions, of one kind, with
// the people named, on a day (today by default), optionally linked to a job; several people only
// for sent messages, a batch. A conversation is held unless `scheduled` gives its start and end.
// With a conversationId: how that scheduled conversation ended. Either way, a next step and date
// can be set on the people as it goes.
export const logInteractionSchema = z
  .object({
    conversationId: z.uuid().optional(),
    outcome: z
      .enum(CONVERSATION_OUTCOMES, {
        error: `Use one of: ${CONVERSATION_OUTCOMES.join(", ")}`,
      })
      .optional(),
    personIds: z
      .array(z.uuid())
      .min(1, { error: "Name at least one person" })
      .max(BATCH_MAX, { error: `At most ${BATCH_MAX} people at once` })
      .optional(),
    kind: z
      .enum(INTERACTION_KINDS, {
        error: `Use one of: ${INTERACTION_KINDS.join(", ")}`,
      })
      .optional(),
    occurredOn: dateSchema.optional(),
    jobId: z.uuid().optional(),
    scheduled: z
      .object({ startsAt: timeSchema, endsAt: timeSchema })
      .optional(),
    note: optionalText(500).optional(),
    nextStep: optionalText(120).optional(),
    nextDate: dateSchema.nullable().optional(),
  })
  .superRefine((input, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (input.conversationId !== undefined) {
      if (input.outcome === undefined) {
        issue("outcome", "Say how the conversation ended");
      }
      for (const field of [
        "personIds",
        "kind",
        "occurredOn",
        "jobId",
        "scheduled",
      ] as const) {
        if (input[field] !== undefined) {
          issue(
            field,
            "Leave this out when recording how a conversation ended",
          );
        }
      }
      return;
    }
    if (input.outcome !== undefined) {
      issue("conversationId", "Name the conversation that ended");
    }
    if (input.personIds === undefined) {
      issue("personIds", "Name at least one person");
    }
    if (input.kind === undefined) {
      issue("kind", "Say what happened");
    }
    if (
      input.personIds &&
      input.personIds.length > 1 &&
      input.kind !== "message-sent"
    ) {
      issue("personIds", "Only sent messages log for several people at once");
    }
    if (input.scheduled) {
      if (input.kind !== "conversation") {
        issue("scheduled", "Only a conversation is scheduled");
      }
      if (input.occurredOn !== undefined) {
        issue("occurredOn", "A scheduled conversation's day is its start's");
      }
      if (input.scheduled.endsAt <= input.scheduled.startsAt) {
        issue("scheduled", "It ends after it starts");
      }
    }
  })
  .transform((input): LogInteractionRequest => {
    const next: NextStep = {
      ...(input.nextStep !== undefined && { nextStep: input.nextStep }),
      ...(input.nextDate !== undefined && { nextDate: input.nextDate }),
    };
    if (input.conversationId !== undefined && input.outcome !== undefined) {
      return {
        type: "outcome",
        conversationId: input.conversationId,
        outcome: input.outcome,
        note: input.note,
        next,
      };
    }
    return {
      type: "log",
      // Checked above: a log names people and a kind.
      personIds: input.personIds ?? [],
      kind: input.kind ?? "message-sent",
      occurredOn: input.occurredOn,
      jobId: input.jobId,
      note: input.note ?? null,
      scheduled: input.scheduled,
      next,
    };
  });

// What a log answers: the interactions it wrote or changed.
export type LoggedInteractions = { interactions: Interaction[] };

// Deleting one's input: which interaction.
export const interactionIdSchema = z.object({ id: z.uuid() });
