import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IReadRecipeUseCase } from "@/src/application/use-cases/recipes/read-recipe.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { CheckedDraft } from "@/src/entities/itemizing-check";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_PIECES,
  MAX_RECIPE_TEXT,
} from "@/src/entities/models/recipe-draft.model";

// The phone shrinks a photo to about 2,000 px before sending it (P10.2), and a page's text is
// capped before it's read (P10.3); these limits only stop what would never be a recipe.
export const MAX_RECIPE_IMAGE_BYTES = MAX_PHOTO_BYTES;

const inputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    text: z.string().trim().min(1).max(MAX_RECIPE_TEXT),
  }),
  z.object({
    kind: z.literal("image"),
    // One photo, or a long screenshot's pieces (P14.11).
    images: z
      .array(
        z.object({
          data: z
            .instanceof(Uint8Array)
            .refine(
              (bytes) =>
                bytes.byteLength > 0 &&
                bytes.byteLength <= MAX_RECIPE_IMAGE_BYTES,
              "The photo is empty or too large",
            ),
          // What the reader's model takes.
          mediaType: z.enum([
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ]),
        }),
      )
      .min(1)
      .max(MAX_PHOTO_PIECES)
      .refine(
        (images) =>
          images.reduce((bytes, image) => bytes + image.data.byteLength, 0) <=
          MAX_PHOTO_BYTES,
        "The photo is too large",
      ),
  }),
  // A PDF (D53), within the same request limit as a photo; its pages are counted when it's read.
  z.object({
    kind: z.literal("document"),
    pdf: z
      .instanceof(Uint8Array)
      .refine(
        (bytes) =>
          bytes.byteLength > 0 && bytes.byteLength <= MAX_RECIPE_IMAGE_BYTES,
        "The PDF is empty or too large",
      ),
  }),
]);

export type IReadRecipeController = ReturnType<typeof readRecipeController>;

export const readRecipeController = (
  readRecipeUseCase: IReadRecipeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "readRecipe",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<CheckedDraft> => {
    logger.debug("Validating read recipe input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to import a recipe");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return readRecipeUseCase(data, userId);
  };
};
