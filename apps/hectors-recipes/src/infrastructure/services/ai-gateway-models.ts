// The model each AI task uses, as AI Gateway ids ("provider/model"), so tuning one is a
// one-line change (ux-plan D27). Spend is capped by the project's Gateway budget.
export const AI_GATEWAY_MODELS = {
  // Opus for the careful read an import needs (ux-plan D36).
  recipeReader: "anthropic/claude-opus-5.5",
} as const;
