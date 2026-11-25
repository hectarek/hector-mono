import { describe, expect, it } from "bun:test";
import { copyWords } from "@/app/_components/copy-state";
import {
  CAST,
  CAST_TODAY,
  type CastName,
  castRows,
} from "@/tests/_support/cast";

const rows = castRows();
const nameAndPiece = (who: CastName) => {
  const { id, name, pieceShape, pieceColor } = CAST.people[who];
  return { userId: id, name, pieceShape, pieceColor };
};

// A copy's lines under its name (B5, B11, B13).
describe("copyWords", () => {
  it("writes B11's request in mono, with no piece beside Priya", () => {
    const copy = rows.copies.find(
      ({ id }) => id === CAST.copies.yourNightMarket.id,
    );
    const request = rows.loans.find(
      ({ id }) => id === CAST.loans.priyaAskedForNightMarket.id,
    );
    if (!copy || !request) {
      throw new Error("The cast has no Night Market or Priya's request");
    }
    const priya = nameAndPiece("priya");

    const words = copyWords({
      copy,
      state: {
        kind: "requested",
        yours: true,
        stamp: { word: "Requested", tone: "red" },
        holder: null,
        promised: null,
        line: [request],
      },
      owner: nameAndPiece("you"),
      people: { [priya.userId]: priya },
      boxedExpansions: [],
      baseTitle: "Night Market",
      today: CAST_TODAY,
      now: new Date("2026-11-10T09:30:00-05:00"),
    });

    expect(words.lines).toEqual([
      { kind: "fact", text: "At home" },
      { kind: "fact", text: "Priya asked for it" },
      { kind: "fact", text: "Good" },
    ]);
    expect(words.stamp).toEqual({ word: "Requested", tone: "red" });
  });
});
