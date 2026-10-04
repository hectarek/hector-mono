"use server";

import { getCurrentUserId } from "@/app/_lib/current-user";
import { actionLogger, text, toActionError } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import { InputParseError } from "@/src/entities/errors/common";
import type { CheckedDraft } from "@/src/entities/itemizing-check";

// A read recipe to check in the form, or why it couldn't be read (ux-plan Phase 10). A link
// also gives the page's address and, when its recipe data has one, its photo.
export type ReadRecipeResult =
  | { draft: CheckedDraft; sourceUrl?: string; imageUrl?: string | null }
  | { error: string };

// Add by photo (P10.2): the photo arrives already shrunk to a JPEG on the phone, or as a
// long screenshot's pieces, top to bottom (P14.11).
export async function readRecipeFromPhoto(
  formData: FormData,
): Promise<ReadRecipeResult> {
  const logger = actionLogger("readRecipeFromPhoto");
  const photos = formData.getAll("photo");
  try {
    const images = await Promise.all(
      photos.map(async (photo) =>
        photo instanceof File
          ? {
              data: new Uint8Array(await photo.arrayBuffer()),
              mediaType: photo.type,
            }
          : photo,
      ),
    );
    const draft = await getInjection("IReadRecipeController")(
      { kind: "image", images },
      await getCurrentUserId(),
    );
    return { draft };
  } catch (err) {
    if (err instanceof InputParseError) {
      logger.warn("Not a photo it can read", {
        types: photos.map((photo) =>
          photo instanceof File ? photo.type : typeof photo,
        ),
      });
      return { error: "Choose a photo: a JPEG, PNG or WebP under 4 MB." };
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

// Add by link (P10.3): the page's own recipe data, or its text read by the recipe reader.
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
