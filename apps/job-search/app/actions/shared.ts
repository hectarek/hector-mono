import { getActionActor } from "@/app/_lib/current-actor";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { getInjection } from "@/di/container";
import type { DI_RETURN_TYPES } from "@/di/types";
import {
  ConflictError,
  DuplicateError,
  HumanOnlyError,
  InputParseError,
  NotAllowedError,
  NotFoundError,
  QueueFullError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import {
  type ChangeContext,
  toolNameSchema,
} from "@/src/entities/models/activity.model";

// Helpers for app/actions/*: not a "use server" module, so nothing here is callable from the client.

// Why an action didn't do what it was asked (docs/build-plan.md KTD4). `calendar-disconnected`
// arrives with the calendar, and `reload-needed` comes from the page tools' wrapper, for an
// action a deploy removed.
type ActionErrorCode =
  | "validation"
  | "unauthenticated"
  | "not-allowed"
  | "not-found"
  | "conflict"
  | "duplicate"
  | "queue-full"
  | "human-only"
  | "calendar-disconnected"
  | "reload-needed"
  // Anything else: logged, and answered with the action's own message.
  | "unexpected";

type ActionFailure = {
  ok: false;
  code: ActionErrorCode;
  message: string;
  // Validation messages by field, for forms that show them under each field.
  fields?: Partial<Record<string, string>>;
  // On a conflict, the record as it is now; on a duplicate, the job that holds the posting.
  current?: unknown;
};

// What every action answers, a page tool's call included. Never a redirect: it would navigate
// the page, and the tool would get nothing back to confirm the write (KTD4).
export type ActionResult<T> =
  | { ok: true; data: T; asOf: string }
  | ActionFailure;

// asOf: when the server answered, so a caller knows how fresh `data` is.
export function succeeded<T>(data: T): ActionResult<T> {
  return { ok: true, data, asOf: new Date().toISOString() };
}

export function actionLogger(op: string): DI_RETURN_TYPES["ILoggerService"] {
  return getInjection("ILoggerService").child({ layer: "action", op });
}

// Who's making a write (KTD7): the session's actor and, when a page tool made the call, the tool's
// name, which a write action takes as its last argument. The name comes from the page, so it's
// only a label, and it's checked as input is (KTD5). Throws before anything is written.
export async function changeContext(tool?: unknown): Promise<ChangeContext> {
  const actor = await getActionActor();
  if (tool === undefined) {
    return actor;
  }
  const { data, error } = toolNameSchema.safeParse(tool);
  if (error) {
    throw new InputParseError("Invalid tool name", { cause: error });
  }
  return { ...actor, tool: data };
}

type Issue = { path: PropertyKey[]; message: string };

// Controllers attach the Zod error as the cause (actions can attach the same shape).
function issuesOf(err: InputParseError): Issue[] {
  const cause = err.cause;
  return cause && typeof cause === "object" && "issues" in cause
    ? (cause as { issues: Issue[] }).issues
    : [];
}

// The nearest field in an issue's path that has a label.
function fieldOf(issue: Issue): string | undefined {
  return [...issue.path]
    .reverse()
    .find(
      (part): part is string =>
        typeof part === "string" && part in FIELD_LABELS,
    );
}

// The first issue, prefixed with its field's label unless the message already names it.
function describeInputError(err: InputParseError): string {
  const [issue] = issuesOf(err);
  if (!issue) {
    return err.message;
  }
  const field = fieldOf(issue);
  const label = field ? FIELD_LABELS[field] : undefined;
  const named =
    label &&
    issue.message.toLowerCase().includes(label.toLowerCase().replace(/s$/, ""));
  return label && !named ? `${label}: ${issue.message}` : issue.message;
}

// Each field's first message, to show under it.
function fieldErrors(
  err: InputParseError,
): Partial<Record<string, string>> | undefined {
  const fields: Partial<Record<string, string>> = {};
  for (const issue of issuesOf(err)) {
    const field = fieldOf(issue);
    if (field && !fields[field]) {
      fields[field] = issue.message;
    }
  }
  return Object.keys(fields).length ? fields : undefined;
}

// The failure envelope for what an action caught. Logged by error class and code only, never a
// message: a database error's carries the query's parameters (docs/build-plan.md KTD20).
export function toActionError(
  err: unknown,
  logger: DI_RETURN_TYPES["ILoggerService"],
  fallback: string,
): ActionFailure {
  const failure = expectedFailure(err);
  if (failure) {
    logger.warn(`Answered ${failure.code}`, loggable(err));
    return failure;
  }
  logger.error("Unexpected failure", loggable(err));
  return { ok: false, code: "unexpected", message: fallback };
}

function expectedFailure(err: unknown): ActionFailure | undefined {
  if (err instanceof InputParseError) {
    const fields = fieldErrors(err);
    return {
      ok: false,
      code: "validation",
      message: describeInputError(err),
      ...(fields && { fields }),
    };
  }
  if (err instanceof UnauthenticatedError) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Your session expired. Sign in again.",
    };
  }
  if (err instanceof NotAllowedError) {
    return { ok: false, code: "not-allowed", message: err.message };
  }
  if (err instanceof HumanOnlyError) {
    return { ok: false, code: "human-only", message: err.message };
  }
  if (err instanceof NotFoundError) {
    return { ok: false, code: "not-found", message: err.message };
  }
  if (err instanceof ConflictError) {
    return {
      ok: false,
      code: "conflict",
      message: err.message,
      current: err.current,
    };
  }
  if (err instanceof DuplicateError) {
    return {
      ok: false,
      code: "duplicate",
      message: err.message,
      current: err.existing,
    };
  }
  if (err instanceof QueueFullError) {
    return { ok: false, code: "queue-full", message: err.message };
  }
  return undefined;
}
