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

// Live updates aren't set up here (no key): there's nothing to listen to, and pages refresh
// instead. Expected where there's no key (tests, local), so it's not a failure.
export class LiveUpdatesOffError extends Error {
  constructor(message = "Live updates are off", options?: ErrorOptions) {
    super(message, options);
  }
}

// Why reading a recipe with AI failed, as the person should hear it.
export type RecipeReadFailure =
  | "no-recipe-found"
  | "budget-paused"
  | "daily-limit"
  | "service-unavailable";

export class RecipeReadError extends Error {
  constructor(
    readonly reason: RecipeReadFailure,
    message = "Couldn't read the recipe",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// Why fetching a recipe's page failed (ux-plan P10.3), as the person should hear it.
export type PageFetchFailure =
  | "not-allowed"
  | "blocked"
  | "not-found"
  | "not-a-page"
  | "too-large"
  | "unreachable";

export class PageFetchError extends Error {
  constructor(
    readonly reason: PageFetchFailure,
    message = "Couldn't fetch the page",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
