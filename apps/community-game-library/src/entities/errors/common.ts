// Recipes' errors. Each names itself: a production build renames classes, and the logs name an
// error by its `name` (loggable.ts).

export class DatabaseOperationError extends Error {
  override name = "DatabaseOperationError";

  constructor(message = "A database operation failed", options?: ErrorOptions) {
    super(message, options);
  }
}

export class NotFoundError extends Error {
  override name = "NotFoundError";

  constructor(message = "Resource not found", options?: ErrorOptions) {
    super(message, options);
  }
}

export class InputParseError extends Error {
  override name = "InputParseError";

  constructor(message = "Invalid input", options?: ErrorOptions) {
    super(message, options);
  }
}

export class UnauthenticatedError extends Error {
  override name = "UnauthenticatedError";

  constructor(message = "Authentication required", options?: ErrorOptions) {
    super(message, options);
  }
}

export class UnauthorizedError extends Error {
  override name = "UnauthorizedError";

  constructor(
    message = "You do not have permission to perform this action",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// Something changed underneath a person between seeing a screen and acting on it (KTD16): the
// copy was lent, the request withdrawn or answered, the last seat taken, the night cancelled, the
// two aren't friends any more, or a loan opened that has to be settled before an account goes. Nothing was sent; the screen says what changed in one line
// (app/_lib/changed-lines.ts) and offers the next best action.
export const CHANGED_REASONS = [
  "copy-lent",
  "request-withdrawn",
  "request-answered",
  "seats-taken",
  "night-cancelled",
  "not-friends",
  "loan-open",
] as const;
export type ChangedReason = (typeof CHANGED_REASONS)[number];

export class ChangedError extends Error {
  override name = "ChangedError";

  constructor(
    readonly reason: ChangedReason,
    options?: ErrorOptions,
  ) {
    super(`Changed: ${reason}`, options);
  }
}
