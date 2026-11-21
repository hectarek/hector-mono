// A member's playing piece (R51, D13): one of four shapes in one of ten colors, which stands for
// them wherever they appear. The values, in the design system's order, are data-model.md's
// user_profiles.piece_shape and piece_color.
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

// Four of the colors are for people's pieces only: a game's cover token never takes them (the
// design system's README and CoverThumb).
export const PEOPLE_ONLY_COLORS = [
  "pumpkin",
  "teal",
  "rose",
  "charcoal",
] as const satisfies readonly PieceColor[];
