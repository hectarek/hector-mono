import { CHANGED_LINES } from "@/app/_lib/changed-lines";
import { getInjection } from "@/di/container";
import type { DI_RETURN_TYPES } from "@/di/types";
import {
  ChangedError,
  type ChangedReason,
  InputParseError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import type { Photo, PhotoType } from "@/src/entities/profile-photo";

// Helpers for app/actions/*: not a "use server" module, so nothing here is callable from the client.

export type ActionState = {
  error?: string;
  message?: string;
  // Validation messages by form field name, for forms that show them under each field.
  fields?: Partial<Record<string, string>>;
  // What changed underneath, for a sheet's ChangedNotice; `error` carries its line as well.
  changed?: ChangedReason;
} | null;

export function actionLogger(op: string): DI_RETURN_TYPES["ILoggerService"] {
  return getInjection("ILoggerService").child({ layer: "action", op });
}

// The photo the form carries, if one was chosen: the shrunk picture as bytes. What type it is
// and how big, the controller checks again.
export async function photoOf(
  formData: FormData,
  name = "photo",
): Promise<Photo | undefined> {
  const file = formData.get(name);
  if (!(file instanceof File) || file.size === 0) {
    return undefined;
  }
  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type as PhotoType,
  };
}

// A form field as it was typed ("" when it's missing), for a controller to trim and check.
export function typed(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

// Fields as the forms label them, in the words of each form's board. Anything not listed (hidden
// ids) is never named: the person can't see those fields, so a code name would only confuse.
// Each form's fields join it (A4 and E6's: name, phone, photo; B7's: condition, conditionNote; B9's,
// G2's, G3's and G4's).
const FIELD_LABELS: Record<string, string> = {
  bestPlayers: "Plays best at",
  categories: "Categories",
  complexity: "Complexity",
  condition: "Condition",
  conditionNote: "Missing or damaged parts",
  declineNote: "Reason",
  description: "Description",
  designers: "Designers",
  imageUrl: "Image address",
  maxMinutes: "Play time",
  maxPlayers: "Players",
  minAge: "Minimum age",
  minMinutes: "Play time",
  minPlayers: "Players",
  name: "Name",
  phone: "Phone",
  photo: "Photo",
  publisher: "Publisher",
  publishers: "Publishers",
  sourceUrl: "Link",
  title: "Title",
  videoUrl: "How-to-play video",
  year: "Year",
};

type Issue = { path: PropertyKey[]; message: string };

// Controllers attach the Zod error as the cause (actions can attach the same shape).
function issuesOf(err: InputParseError): Issue[] {
  const cause = err.cause;
  return cause && typeof cause === "object" && "issues" in cause
    ? (cause as { issues: Issue[] }).issues
    : [];
}

// The nearest field in an issue's path that the form shows the person.
function fieldOf(issue: Issue): string | undefined {
  return [...issue.path]
    .reverse()
    .find(
      (part): part is string =>
        typeof part === "string" && part in FIELD_LABELS,
    );
}

// The first issue, prefixed with its field's label unless the message already names it
// ("Name is required", not "Name: Name is required").
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

// What the person is told, and what the logs keep: an error's class and code, never its message
// or a field's value (docs/build-plan.md KTD1).
export function toActionError(
  err: unknown,
  logger: DI_RETURN_TYPES["ILoggerService"],
  fallback: string,
): ActionState {
  if (err instanceof InputParseError) {
    logger.warn("Input validation failed", loggable(err));
    const fields = fieldErrors(err);
    return fields
      ? { error: describeInputError(err), fields }
      : { error: describeInputError(err) };
  }
  if (err instanceof UnauthenticatedError) {
    logger.warn("Unauthenticated attempt", loggable(err));
    return { error: "Your session expired. Sign in again." };
  }
  if (err instanceof ChangedError) {
    logger.info("Changed underneath", { ...loggable(err), reason: err.reason });
    return { error: CHANGED_LINES[err.reason].line, changed: err.reason };
  }
  if (err instanceof UnauthorizedError || err instanceof NotFoundError) {
    logger.warn("Denied", loggable(err));
    return { error: err.message };
  }
  logger.error("Unexpected failure", loggable(err));
  return { error: fallback };
}
