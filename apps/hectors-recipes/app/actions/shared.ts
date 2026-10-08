import { getInjection } from "@/di/container";
import type { DI_RETURN_TYPES } from "@/di/types";
import {
  InputParseError,
  NotFoundError,
  PageFetchError,
  type PageFetchFailure,
  RecipeReadError,
  type RecipeReadFailure,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import {
  DAILY_RECIPE_READS,
  MAX_PDF_PAGES,
} from "@/src/entities/models/recipe-draft.model";

// Helpers for app/actions/*: not a "use server" module, so nothing here is callable from the client.

export type ActionState = {
  error?: string;
  message?: string;
  // Validation messages by form field name, for forms that show them under each field.
  fields?: Partial<Record<string, string>>;
} | null;

export function actionLogger(op: string): DI_RETURN_TYPES["ILoggerService"] {
  return getInjection("ILoggerService").child({ layer: "action", op });
}

export function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

// Fields as the forms label them. Anything not listed (hidden ids, a line's `raw`) is never
// named: the user can't see those fields, so a code name would only confuse.
const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  ingredients: "Ingredients",
  steps: "Method",
  yieldServings: "Servings",
  servings: "Servings",
  timeMinutes: "Time",
  tags: "Tags",
  sourceUrl: "Source link",
  imageUrl: "Photo link",
  date: "Date",
  cookDate: "Cook day",
  eatDates: "Eat days",
  name: "Name",
};

type Issue = { path: PropertyKey[]; message: string };

// Controllers attach the Zod error as the cause (actions can attach the same shape).
function issuesOf(err: InputParseError): Issue[] {
  const cause = err.cause;
  return cause && typeof cause === "object" && "issues" in cause
    ? (cause as { issues: Issue[] }).issues
    : [];
}

// The nearest field in an issue's path that the form shows the user.
function fieldOf(issue: Issue): string | undefined {
  return [...issue.path]
    .reverse()
    .find(
      (part): part is string =>
        typeof part === "string" && part in FIELD_LABELS,
    );
}

// The first issue, prefixed with its field's label unless the message already names it
// ("Name is required", not "Name: Name is required"; "Add at least one ingredient" names
// Ingredients too).
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

// What import says when reading fails (ux-plan P10.1). The screen offers Add manually beside it.
const READ_FAILURES: Record<RecipeReadFailure, string> = {
  "no-recipe-found": "No recipe found there. Try another photo, file or link.",
  // There's no monthly budget, only the account's credit (D86), so it lasts until Hector adds more.
  "budget-paused":
    "Reading recipes with AI is paused: the app has run out of AI credit. Let Hector know so he can add more. You can still add this one by hand.",
  "daily-limit": `You've read ${DAILY_RECIPE_READS} recipes in the last day, the most for one day. Try again tomorrow, or add this one by hand.`,
  "service-unavailable":
    "The recipe reader isn't answering. Try again in a minute.",
  "too-many-pages": `That PDF has more than ${MAX_PDF_PAGES} pages. For a long PDF like a cookbook, screenshot the recipe's pages instead.`,
  "locked-document":
    "That PDF is password-protected. Save a copy without the password, or screenshot it.",
  "unreadable-document":
    "Couldn't open that PDF. Try saving it again, or screenshot it.",
};

// What Add by link or text says when the page can't be fetched (P10.3). The screen offers pasting the
// text, a photo, or adding it by hand beside it.
const FETCH_FAILURES: Record<PageFetchFailure, string> = {
  "not-allowed": "That isn't a public web page.",
  blocked: "That site won't let the app read it.",
  "not-found": "That page wasn't found. Check the link.",
  "not-a-page":
    "That link isn't a web page. If it's a PDF, save it and add it by photo or file.",
  "too-large": "That page is too big to read.",
  unreachable: "Couldn't reach that site. Check the link, or try again soon.",
};

export function toActionError(
  err: unknown,
  logger: DI_RETURN_TYPES["ILoggerService"],
  fallback: string,
): ActionState {
  if (err instanceof InputParseError) {
    logger.warn("Input validation failed", { error: err.message });
    const fields = fieldErrors(err);
    return fields
      ? { error: describeInputError(err), fields }
      : { error: describeInputError(err) };
  }
  if (err instanceof UnauthenticatedError) {
    logger.warn("Unauthenticated attempt");
    return { error: "Your session expired. Sign in again." };
  }
  if (err instanceof UnauthorizedError || err instanceof NotFoundError) {
    logger.warn("Denied", { error: err.message });
    return { error: err.message };
  }
  if (err instanceof RecipeReadError) {
    logger.warn("Couldn't read a recipe", { reason: err.reason });
    return { error: READ_FAILURES[err.reason] };
  }
  if (err instanceof PageFetchError) {
    logger.warn("Couldn't fetch a recipe's page", { reason: err.reason });
    return { error: FETCH_FAILURES[err.reason] };
  }
  logger.error("Unexpected failure", { error: String(err) });
  return { error: fallback };
}
