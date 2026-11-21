// A photo is shrunk on the phone before a server action stores it (KTD11): at most 800px on its
// long side and under 300 KB, as a JPEG. Server Actions take 1 MB by default, and the action
// checks the type and size again.
const LONG_EDGE = 800;
const MAX_IMAGE_BYTES = 300_000;

export function fitWithin(
  width: number,
  height: number,
  longEdge = LONG_EDGE,
): { width: number; height: number } {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

// The photo as a JPEG within those limits, turned upright from its camera orientation, at the
// best quality that fits. Browser only; throws when the browser can't open the file (HEIC on a
// desktop browser) or no quality fits.
export async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas to draw the photo on");
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
    }
    throw new Error("The photo is too large even shrunk");
  } finally {
    bitmap.close();
  }
}
