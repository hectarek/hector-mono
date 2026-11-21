import { cn } from "@repo/ui/lib/utils";
import type { PieceColor, PieceShape } from "@/src/entities/piece";

// A playing piece stands for one person (R51, D13): one of four shapes in one of ten colors,
// always with its navy outline. One path each, in the same 22 by 32 box, from the design
// system's Piece guidelines. Its color is data-color, which the theme paints, so no color is
// written here.
const PATHS: Record<PieceShape, string> = {
  pawn: "M11 1a6 6 0 0 1 4.2 10.3L20 27.5a2.5 2.5 0 0 1-2.4 3.2H4.4A2.5 2.5 0 0 1 2 27.5l4.8-16.2A6 6 0 0 1 11 1z",
  cone: "M11 2.2c.9 0 1.6.5 2 1.5l6.6 23.5a2.6 2.6 0 0 1-2.5 3.5H4.9a2.6 2.6 0 0 1-2.5-3.5L9 3.7c.4-1 1.1-1.5 2-1.5z",
  house:
    "M11 3l8.5 8.5V28a2.7 2.7 0 0 1-2.7 2.7H5.2A2.7 2.7 0 0 1 2.5 28V11.5z",
  // One path of three parts: the hull and two sails.
  ship: "M2.2 21.8h17.6l-2.4 7.1a2.6 2.6 0 0 1-2.5 1.8H7.1a2.6 2.6 0 0 1-2.5-1.8zM10.4 2.5l8.4 16.3h-8.4zM7.6 7.6v11.2H3.2z",
};

// Width by height, and the outline in the box's units, thicker as the piece shrinks: 11 beside
// 12px text, 16 in a line of text, on a track and in the You button, 20 in a list row, 24 in a
// row of seats, and 14 only for a guest beside a 20.
const SIZES = {
  11: { box: "h-4 w-2.75", outline: 2.2 },
  14: { box: "h-5 w-3.5", outline: 2 },
  16: { box: "h-5.75 w-4", outline: 1.8 },
  20: { box: "h-7.25 w-5", outline: 1.6 },
  24: { box: "h-8.75 w-6", outline: 1.5 },
} as const;

export type PieceSize = keyof typeof SIZES;

// Pieces stand for people the text beside them names, so they're hidden from screen readers.
export function Piece({
  shape,
  color,
  size = 20,
}: {
  shape: PieceShape;
  color: PieceColor;
  size?: PieceSize;
}) {
  return (
    <svg
      viewBox="0 0 22 32"
      aria-hidden="true"
      className={cn("shrink-0 stroke-foreground", SIZES[size].box)}
    >
      <path
        d={PATHS[shape]}
        data-color={color}
        strokeWidth={SIZES[size].outline}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// An open seat: always the Pawn, empty, with a dashed outline (the seat-dash token).
export function OpenSeat({ size = 24 }: { size?: PieceSize }) {
  return (
    <svg
      viewBox="0 0 22 32"
      aria-hidden="true"
      className={cn("shrink-0 fill-none stroke-foreground", SIZES[size].box)}
    >
      <path
        d={PATHS.pawn}
        strokeWidth={1.6}
        strokeLinejoin="miter"
        strokeDasharray="3 2.5"
      />
    </svg>
  );
}
