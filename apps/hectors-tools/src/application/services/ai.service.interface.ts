import type { z } from "zod";

/**
 * A generic AI client. The underlying provider (currently the Vercel AI
 * Gateway) is an infrastructure detail — consumers depend only on this
 * capability-shaped interface so any future tool can reuse it.
 *
 * Only `generateObject` is implemented today (the Resume Analyzer's needs).
 * The shared `AiGenerateOptions` base is designed so `generateText` / `stream`
 * can be added later without reshaping callers.
 */

export interface AiFilePart {
  /** Raw file bytes (e.g. a PDF) passed straight to a multimodal model. */
  data: Uint8Array;
  /** MIME type, e.g. "application/pdf". */
  mediaType: string;
}

export interface AiGenerateOptions {
  /** System instruction (role/behavior). */
  system?: string;
  /** Text prompt. Combined with `files` into a multimodal message when present. */
  prompt?: string;
  /** Optional files (images, PDFs) sent alongside the prompt. */
  files?: AiFilePart[];
  /** Override the default model (otherwise `AI_MODEL` env or the built-in default). */
  model?: string;
}

export interface IAiService {
  /** Generate a structured object validated against the given Zod schema. */
  generateObject<T>(
    options: AiGenerateOptions & { schema: z.ZodType<T> },
  ): Promise<T>;

  // Future extensions — add when a tool needs them:
  //   generateText(options: AiGenerateOptions): Promise<string>;
  //   stream(options: AiGenerateOptions): AsyncIterable<string>;
}
