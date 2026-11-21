import { describe, expect, it } from "bun:test";
import {
  PEOPLE_ONLY_COLORS,
  PIECE_COLORS,
  PIECE_SHAPES,
} from "@/src/entities/piece";

describe("pieces", () => {
  it("has the design system's four shapes and ten colors, in its order", () => {
    expect(PIECE_SHAPES).toEqual(["pawn", "cone", "house", "ship"]);
    expect(PIECE_COLORS).toEqual([
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
    ]);
  });

  it("keeps pumpkin, teal, rose and charcoal for people's pieces only", () => {
    expect(PEOPLE_ONLY_COLORS).toEqual(["pumpkin", "teal", "rose", "charcoal"]);
    // Which leaves five for a game's cover token, besides bone, the square it sits on.
    expect(
      PIECE_COLORS.filter(
        (color) =>
          color !== "bone" &&
          !(PEOPLE_ONLY_COLORS as readonly string[]).includes(color),
      ),
    ).toEqual(["brick", "mustard", "moss", "ocean", "plum"]);
  });
});
