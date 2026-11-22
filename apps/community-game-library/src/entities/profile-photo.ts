// A member's photo (R40, KTD11): what the action accepts, after the phone has shrunk it to at
// most 800px and under 300 KB (app/_lib/shrink-image.ts), and how long its signed address lasts.
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

export const MAX_PHOTO_BYTES = 300_000;

// A signed address lasts an hour, and is made only for someone who may see the person (KTD4).
export const PHOTO_URL_SECONDS = 3600;

// Under Photo (screens.md, When something goes wrong), for a photo that's too large or fails.
export const PHOTO_FAILED_LINE = "That photo didn’t upload. Try a smaller one.";

export type Photo = { bytes: Uint8Array; contentType: PhotoType };

export const PHOTO_EXTENSIONS: Record<PhotoType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
