import type { z } from "zod";
import type {
  AiGenerateOptions,
  IAiService,
} from "@/src/application/services/ai.service.interface";
import {
  AiGenerationError,
  type AiGenerationFailure,
} from "@/src/entities/errors/common";

/**
 * Deterministic AI client for tests (`NODE_ENV=test`). Returns a canned
 * resume-analysis-shaped object validated against the caller's schema, so the
 * full controller → use-case → service stack can be exercised without network
 * access or a gateway key, or fails with `failWith` when it's set.
 */
const CANNED_RESULT = {
  matchScore: 72,
  summary: "Solid overlap with a few gaps to close.",
  matchedSkills: ["TypeScript", "React", "Node.js"],
  missingSkills: ["Kubernetes", "GraphQL"],
  atsKeywords: {
    present: ["TypeScript", "React"],
    missing: ["Kubernetes", "CI/CD"],
  },
  suggestions: [
    { priority: "high", suggestion: "Add measurable impact to recent roles." },
    {
      priority: "medium",
      suggestion: "Mention Kubernetes experience if any exists.",
    },
  ],
};

export class MockAiService implements IAiService {
  failWith: AiGenerationFailure | null = null;

  async generateObject<T>(
    options: AiGenerateOptions & { schema: z.ZodType<T> },
  ): Promise<T> {
    if (this.failWith) {
      throw new AiGenerationError(this.failWith);
    }
    return options.schema.parse(CANNED_RESULT);
  }
}
