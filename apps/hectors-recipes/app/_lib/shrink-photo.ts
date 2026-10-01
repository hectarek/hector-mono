import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_PIECES,
} from "@/src/entities/models/recipe-draft.model";

// A photo is shrunk on the phone before it's sent (ux-plan P10.2): a long edge of about 2,000 px
// keeps a cookbook page's print readable, and as a JPEG it stays well under the upload limit.
export const PHOTO_LONG_EDGE = 2000;

export function fitWithin(
  width: number,
  height: number,
  longEdge = PHOTO_LONG_EDGE,
): { width: number; height: number } {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

// A long scrolling screenshot shrunk whole is too narrow to read (1080 x 6000 came out 360 px
// wide), so one more than twice as tall as it's wide is cut into pieces about 1.5 times as
// tall as wide, each overlapping the one before by a tenth, so a line cut at one edge is whole
// in the next (P14.11). A very long one gets taller (so smaller) pieces rather than more.
const PIECE_SHAPE = 1.5;
const OVERLAP = 0.1;

// Each piece's rows in the photo (`top`, `height`) and its size once shrunk.
export type PhotoPiece = {
  top: number;
  height: number;
  width: number;
  outHeight: number;
};

export function photoPieces(width: number, height: number): PhotoPiece[] {
  const piece = (top: number, rows: number): PhotoPiece => {
    const out = fitWithin(width, rows);
    return { top, height: rows, width: out.width, outHeight: out.height };
  };
  if (height <= width * 2) return [piece(0, height)];

  let rows = width * PIECE_SHAPE;
  // A tenth of a piece's slack, so a screenshot just past a whole number of pieces doesn't
  // get a last one of a few new rows; the pieces are spread evenly from top to bottom.
  let count = Math.ceil((height - rows) / (rows * (1 - OVERLAP)) - 0.1) + 1;
  if (count > MAX_PHOTO_PIECES) {
    count = MAX_PHOTO_PIECES;
    rows = height / (1 + (count - 1) * (1 - OVERLAP));
  }
  const tall = Math.round(rows);
  return Array.from({ length: count }, (_, index) =>
    piece(Math.round((index * (height - tall)) / (count - 1)), tall),
  );
}

// The photo as JPEGs within PHOTO_LONG_EDGE (one, or a long screenshot's pieces), turned
// upright from its camera orientation, at a quality that keeps them within MAX_PHOTO_BYTES in
// all where it can. Browser only; throws when the browser can't open the file (HEIC on a
// desktop browser).
export async function shrinkPhoto(file: File): Promise<Blob[]> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const pieces = photoPieces(bitmap.width, bitmap.height);
    let blobs: Blob[] = [];
    for (const quality of [0.85, 0.7, 0.55]) {
      blobs = await Promise.all(
        pieces.map((piece) => drawPiece(bitmap, piece, quality)),
      );
      const bytes = blobs.reduce((total, blob) => total + blob.size, 0);
      if (bytes <= MAX_PHOTO_BYTES) break;
    }
    return blobs;
  } finally {
    bitmap.close();
  }
}

function drawPiece(
  bitmap: ImageBitmap,
  piece: PhotoPiece,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = piece.width;
  canvas.height = piece.outHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No canvas to draw the photo on");
  }
  context.drawImage(
    bitmap,
    0,
    piece.top,
    bitmap.width,
    piece.height,
    0,
    0,
    piece.width,
    piece.outHeight,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Couldn't make a JPEG")),
      "image/jpeg",
      quality,
    ),
  );
}
