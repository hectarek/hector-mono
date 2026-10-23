export class DatabaseOperationError extends Error {
  constructor(message = "A database operation failed", options?: ErrorOptions) {
    super(message, options);
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found", options?: ErrorOptions) {
    super(message, options);
  }
}

export class InputParseError extends Error {
  constructor(message = "Invalid input", options?: ErrorOptions) {
    super(message, options);
  }
}

export class UnauthenticatedError extends Error {
  constructor(message = "Authentication required", options?: ErrorOptions) {
    super(message, options);
  }
}

export class UnauthorizedError extends Error {
  constructor(
    message = "You do not have permission to perform this action",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// Signed in, but not one of the app's two accounts (docs/build-plan.md R23). Seen by
// strangers, so it never says whose workspace this is.
export class NotAllowedError extends Error {
  constructor(
    message = "This account can't use the app.",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// Something only Hector may do, asked for from Claude's session (R21).
export class HumanOnlyError extends Error {
  constructor(message = "Only Hector can do this.", options?: ErrorOptions) {
    super(message, options);
  }
}
