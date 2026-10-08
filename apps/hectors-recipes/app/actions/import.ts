"use server";

import { getCurrentUserId } from "@/app/_lib/current-user";
import { actionLogger, text, toActionError } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import { InputParseError } from "@/src/entities/errors/common";
import type { CheckedDraft } from "@/src/entities/itemizing-check";
import { MAX_PHOTOS } from "@/src/entities/models/recipe-draft.model";

// A read recipe to check in the form, or why it couldn't be read (ux-plan Phase 10). A link
// also gives the page's address and, when its recipe data has one, its photo.
export type ReadRecipeResult =
  | { draft: CheckedDraft; sourceUrl?: string; imageUrl?: string | null }
  | { error: string };

// Add by photo (P10.2): up to MAX_PHOTOS photos of one recipe (D53), in fields `photo-1`,
// `photo-2` and so on, each already shrunk to JPEG on the phone: one image, or a long
// screenshot's pieces, top to bottom (P14.11).
export async function readRecipeFromPhoto(
  formData: FormData,
): Promise<ReadRecipeResult> {
  const logger = actionLogger("readRecipeFromPhoto");
  const sent = Array.from({ length: MAX_PHOTOS }, (_, index) =>
    formData.getAll(`photo-${index + 1}`),
  ).filter((pieces) => pieces.length > 0);
  try {
    const photos = await Promise.all(
      sent.map((pieces) =>
        Promise.all(
          pieces.map(async (piece) =>
            piece instanceof File
              ? {
                  data: new Uint8Array(await piece.arrayBuffer()),
                  mediaType: piece.type,
                }
              : piece,
          ),
        ),
      ),
    );
    const draft = await getInjection("IReadRecipeController")(
      { kind: "image", photos },
      await getCurrentUserId(),
    );
    return { draft };
  } catch (err) {
    if (err instanceof InputParseError) {
      logger.warn("Not photos it can read", {
        types: sent
          .flat()
          .map((piece) => (piece instanceof File ? piece.type : typeof piece)),
      });
      return {
        error: `Choose up to ${MAX_PHOTOS} photos: JPEG, PNG or WebP, under 4 MB in all.`,
      };
    }
    const fallback = "Couldn't read that photo. Try again.";
    return { error: toActionError(err, logger, fallback)?.error ?? fallback };
  }
}

// Add by file (D53): a PDF, sent as it is; the reader counts its pages before reading it.
export async function readRecipeFromDocument(
  formData: FormData,
): Promise<ReadRecipeResult> {
  const logger = actionLogger("readRecipeFromDocument");
  const pdf = formData.get("pdf");
  try {
    const draft = await getInjection("IReadRecipeController")(
      {
        kind: "document",
        pdf:
          pdf instanceof File ? new Uint8Array(await pdf.arrayBuffer()) : pdf,
      },
      await getCurrentUserId(),
    );
    return { draft };
  } catch (err) {
    if (err instanceof InputParseError) {
      return { error: "Choose a PDF under 4 MB." };
    }
    const fallback = "Couldn't read that PDF. Try again.";
    return { error: toActionError(err, logger, fallback)?.error ?? fallback };
  }
}

// Add by link or text, given a link (P10.3, D73): the page's own recipe data, or its text read by the recipe reader.
export async function readRecipeFromLink(
  formData: FormData,
): Promise<ReadRecipeResult> {
  const logger = actionLogger("readRecipeFromLink");
  try {
    const { draft, sourceUrl, imageUrl } = await getInjection(
      "IReadRecipeFromLinkController",
    )({ url: formData.get("url") }, await getCurrentUserId());
    return { draft, sourceUrl, imageUrl };
  } catch (err) {
    if (err instanceof InputParseError) {
      return { error: "That doesn't look like a link to a web page." };
    }
    const fallback = "Couldn't read that page. Try again.";
    return { error: toActionError(err, logger, fallback)?.error ?? fallback };
  }
}

// A recipe's text pasted in, for a site that won't let the app read it (P10.3, D34).
export async function readRecipeFromText(
  formData: FormData,
): Promise<ReadRecipeResult> {
  const logger = actionLogger("readRecipeFromText");
  const pasted = text(formData, "text");
  if (!pasted) {
    return { error: "Paste the recipe's text first." };
  }
  try {
    const draft = await getInjection("IReadRecipeController")(
      { kind: "text", text: pasted },
      await getCurrentUserId(),
    );
    return { draft };
  } catch (err) {
    if (err instanceof InputParseError) {
      return { error: "That's too much text. Paste just the recipe." };
    }
    const fallback = "Couldn't read that text. Try again.";
    return { error: toActionError(err, logger, fallback)?.error ?? fallback };
  }
}
