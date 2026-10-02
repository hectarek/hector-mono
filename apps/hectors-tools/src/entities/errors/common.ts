export class InputParseError extends Error {
  constructor(message = "Invalid input", options?: ErrorOptions) {
    super(message, options);
  }
}

// Why an AI call failed, as the person should hear it.
export type AiGenerationFailure =
  | "unusable-answer"
  | "budget-paused"
  | "service-unavailable";

export class AiGenerationError extends Error {
  constructor(
    readonly reason: AiGenerationFailure,
    message = "AI generation failed",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
