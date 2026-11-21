// A member's playing piece (R51, D13): one of four shapes in one of ten colors, which stands for
// them wherever they appear. The values are data-model.md's user_profiles.piece_shape and
// piece_color. U2 added them for the Piece component; U3 builds the profile around them.
export const PIECE_SHAPES = ["pawn", "cone", "house", "ship"] as const;
export type PieceShape = (typeof PIECE_SHAPES)[number];

export const PIECE_COLORS = [
  "brick",
  "pumpkin",
  "mustard",
  "moss",
  "teal",
  "ocean",
  "plum",
  "rose",
  "charcoal",
  "bone",
] as const;
export type PieceColor = (typeof PIECE_COLORS)[number];
