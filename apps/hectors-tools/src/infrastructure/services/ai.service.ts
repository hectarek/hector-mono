import {
  generateText,
  type LanguageModel,
  type ModelMessage,
  Output,
  type UserContent,
} from "ai";
import type { z } from "zod";
import type {
  AiGenerateOptions,
  IAiService,
} from "@/src/application/services/ai.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";

/** Used when neither `opts.model` nor the `AI_MODEL` env var is set. */
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

/**
 * AI client on AI SDK 7, backed by the Vercel AI Gateway (the SDK's default
 * global provider, so a `provider/model` string is a Gateway model). Auth comes
 * from the `AI_GATEWAY_API_KEY` env var. Tests pass a mock model instead.
 */
export class AiService implements IAiService {
  private readonly logger: ILoggerService;

  constructor(
    loggerService: ILoggerService,
    // `||`, not `??`: an empty `AI_MODEL=` (as in .env.example) means the default.
    private readonly defaultModel: LanguageModel = process.env.AI_MODEL ||
      DEFAULT_MODEL,
  ) {
    this.logger = loggerService.child({ layer: "service", op: "ai" });
  }

  async generateObject<T>(
    options: AiGenerateOptions & { schema: z.ZodType<T> },
  ): Promise<T> {
    const model = options.model ?? this.defaultModel;
    const modelId = typeof model === "string" ? model : model.modelId;
    const logger = this.logger.child({ op: "generateObject" });

    try {
      logger.debug("Generating structured output", {
        model: modelId,
        fileCount: options.files?.length ?? 0,
      });

      const result = await generateText({
        model,
        instructions: options.system,
        output: Output.object({ schema: options.schema }),
        ...this.buildContent(options),
      });

      return result.output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Structured generation failed", {
        model: modelId,
        error: message,
      });
      throw new DatabaseOperationError("AI generation failed", {
        cause: error,
      });
    }
  }

  /**
   * Builds the request body — a plain `prompt` for text-only calls, or a
   * multimodal `messages` payload when files are attached. Shared so future
   * `generateText` / `stream` methods produce identical request shapes.
   */
  private buildContent(
    options: AiGenerateOptions,
  ): { prompt: string } | { messages: ModelMessage[] } {
    if (!options.files?.length) {
      return { prompt: options.prompt ?? "" };
    }

    const content: UserContent = [];
    if (options.prompt) {
      content.push({ type: "text", text: options.prompt });
    }
    for (const file of options.files) {
      content.push({
        type: "file",
        data: file.data,
        mediaType: file.mediaType,
      });
    }

    return { messages: [{ role: "user", content }] };
  }
}
