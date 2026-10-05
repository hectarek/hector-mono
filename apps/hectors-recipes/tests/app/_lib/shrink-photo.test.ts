import { describe, expect, it } from "bun:test";
import { fitWithin, photoPieces, photoShare } from "@/app/_lib/shrink-photo";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_PIECES,
} from "@/src/entities/models/recipe-draft.model";

describe("fitWithin", () => {
  it("shrinks the long edge to 2,000 px, keeping the shape", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(1170, 2532)).toEqual({ width: 924, height: 2000 });
  });

  it("leaves a small photo as it is", () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
});

// A long scrolling screenshot shrunk whole was 360 px wide, too small to read (P14.11).
describe("photoPieces", () => {
  it("keeps a photo up to twice as tall as it's wide in one piece", () => {
    expect(photoPieces(4032, 3024)).toEqual([
      { top: 0, height: 3024, width: 2000, outHeight: 1500 },
    ]);
    expect(photoPieces(1000, 2000)).toHaveLength(1);
  });

  it("cuts a long screenshot into overlapping pieces at its full width", () => {
    const pieces = photoPieces(1080, 6000);
    expect(pieces.every((piece) => piece.width === 1080)).toBe(true);
    // From the top to the bottom, each piece overlapping the one before.
    expect(pieces[0]?.top).toBe(0);
    const last = pieces.at(-1);
    expect((last?.top ?? 0) + (last?.height ?? 0)).toBe(6000);
    pieces.slice(1).forEach((piece, index) => {
      const before = pieces[index];
      expect(piece.top).toBeLessThan(
        (before?.top ?? 0) + (before?.height ?? 0),
      );
    });
    expect(pieces.length).toBeLessThanOrEqual(MAX_PHOTO_PIECES);
  });

  // 1080 x 6000 used to get a fifth piece of six new rows.
  it("spreads the pieces evenly, with no last piece of a few new rows", () => {
    const pieces = photoPieces(1080, 6000);
    expect(pieces).toHaveLength(4);
    const steps = pieces
      .slice(1)
      .map((piece, index) => piece.top - (pieces[index]?.top ?? 0));
    expect(Math.max(...steps) - Math.min(...steps)).toBeLessThanOrEqual(1);
  });

  it("uses taller, smaller pieces rather than more of them for a very long one", () => {
    const pieces = photoPieces(1080, 30_000);
    expect(pieces).toHaveLength(MAX_PHOTO_PIECES);
    expect(pieces.every((piece) => piece.outHeight <= 2000)).toBe(true);
    const last = pieces.at(-1);
    expect((last?.top ?? 0) + (last?.height ?? 0)).toBe(30_000);
  });

  // D53: a screenshot read with other photos gets its share of the pieces.
  it("cuts no more pieces than it's given, still covering the whole screenshot", () => {
    const pieces = photoPieces(1080, 6000, 2);
    expect(pieces).toHaveLength(2);
    const last = pieces.at(-1);
    expect((last?.top ?? 0) + (last?.height ?? 0)).toBe(6000);
  });
});

// D53: photos read together share the read's images and bytes evenly.
describe("photoShare", () => {
  it("gives one photo everything, and three a third each", () => {
    expect(photoShare(1)).toEqual({
      maxPieces: MAX_PHOTO_PIECES,
      maxBytes: MAX_PHOTO_BYTES,
    });
    expect(photoShare(3)).toEqual({
      maxPieces: 2,
      maxBytes: MAX_PHOTO_BYTES / 3,
    });
  });
});
