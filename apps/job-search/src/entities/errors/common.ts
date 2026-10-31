// Each error names itself: a production build renames classes, and the logs name an error by
// its `name` (loggable.ts).

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

// A write against a record that changed since it was read (R22). It carries the record as it
// is now, for the form or Claude to compare against (docs/build-plan.md KTD15).
export class ConflictError extends Error {
  override name = "ConflictError";

  constructor(
    readonly current: unknown,
    message = "This changed since it was read.",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// Signed in, but not one of the app's two accounts (docs/build-plan.md R23). Seen by
// strangers, so it never says whose workspace this is.
export class NotAllowedError extends Error {
  override name = "NotAllowedError";

  constructor(
    message = "This account can't use the app.",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// Something only Hector may do, asked for from Claude's session (R21).
export class HumanOnlyError extends Error {
  override name = "HumanOnlyError";

  constructor(message = "Only Hector can do this.", options?: ErrorOptions) {
    super(message, options);
  }
}

// A posting already on a job, whatever its review (R20, docs/build-plan.md KTD8). It carries that
// job: where it stands and, when dismissed, why.
export class DuplicateError extends Error {
  override name = "DuplicateError";

  constructor(
    readonly existing: unknown,
    message = "This posting is already on a job.",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// Claude's proposals waiting for Hector's review are at the cap his settings set (KTD8). The
// message names the cap, so Claude knows how many wait (U6's review).
export class QueueFullError extends Error {
  override name = "QueueFullError";

  constructor(cap: number, options?: ErrorOptions) {
    super(
      `The review queue is full at Hector's cap of ${cap}: he reviews what's waiting first.`,
      options,
    );
  }
}
