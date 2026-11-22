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

// The colors a cover's token takes: the rest, without bone, the square it sits on.
const COVER_COLORS = [
  "brick",
  "mustard",
  "moss",
  "ocean",
  "plum",
] as const satisfies readonly Exclude<
  PieceColor,
  (typeof PEOPLE_ONLY_COLORS)[number] | "bone"
>[];
export type CoverColor = (typeof COVER_COLORS)[number];

// A game's token color, the same on every screen and every visit, since the catalog keeps none:
// picked from its id, and an expansion takes its base game's, as B10 draws Night Tide.
export function coverColorOf(game: {
  id: string;
  baseGameId: string | null;
}): CoverColor {
  const id = game.baseGameId ?? game.id;
  let sum = 0;
  for (const char of id) {
    sum += char.charCodeAt(0);
  }
  return COVER_COLORS[sum % COVER_COLORS.length] ?? "mustard";
}
