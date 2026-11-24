import { z } from "zod";

// A member's photo (R40, KTD11): what the action accepts, after the phone has shrunk it to at
// most 800px and under 300 KB (app/_lib/shrink-image.ts), and how long its signed address lasts.
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

export const MAX_PHOTO_BYTES = 300_000;

// A signed address lasts an hour, and is made only for someone who may see the person (KTD4).
export const PHOTO_URL_SECONDS = 3600;

// The picture a Google sign-up came with, as A4's photo starts from it (Hector, 2026-11-24): only
// an https address, and Google's at 400px, where its address asks for the 96 a sign-in gives
// ("…=s96-c"), so the photo isn't soft once shrunk like a chosen one. None for an email sign-up.
export function startingPhotoOf(
  image: string | null | undefined,
): string | null {
  if (!image) return null;
  let address: URL;
  try {
    address = new URL(image);
  } catch {
    return null;
  }
  if (address.protocol !== "https:") return null;
  address.pathname = address.pathname.replace(/=s\d+-c$/, "=s400-c");
  return address.toString();
}

// Under Photo (screens.md, When something goes wrong), for a photo that's too large or fails.
export const PHOTO_FAILED_LINE = "That photo didn’t upload. Try a smaller one.";

export type Photo = { bytes: Uint8Array; contentType: PhotoType };

export const PHOTO_EXTENSIONS: Record<PhotoType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// A photo as the action hands it on, checked again after the phone shrank it (KTD11): a profile's,
// a suggested game's box, a game's picture.
export const photoSchema = z.object({
  contentType: z.enum(PHOTO_TYPES, PHOTO_FAILED_LINE),
  bytes: z
    .instanceof(Uint8Array)
    .refine(
      (bytes) => bytes.byteLength > 0 && bytes.byteLength <= MAX_PHOTO_BYTES,
      PHOTO_FAILED_LINE,
    ),
});
