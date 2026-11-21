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
