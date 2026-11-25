import { describe, expect, it } from "bun:test";
import {
  bannedWords,
  copiedWords,
  longestCopiedRun,
  noEmDash,
  opensWithTitle,
  wordCount,
} from "./checks.mjs";

// A made-up game's article text.
const text =
  "Harbor Lights is a tile-laying game. Players draw a harbor tile, place it beside the others and may put a boat on it. When a channel is closed, the boats on it score for their owners, and the player with the most points at the end wins.";
const context = { vars: { title: "Harbor Lights", text } };

const fresh =
  "A tile-laying game set in a busy port. On each turn a player adds a harbor tile next to the ones already down and can claim it with a boat. Finished channels pay their boats' owners, and the highest score at the end decides who wins.";

describe("longestCopiedRun", () => {
  it("finds the longest run of the source's words, in order", () => {
    expect(
      longestCopiedRun("Each player may put a boat on it today", text),
    ).toBe("may put a boat on it");
  });

  it("ignores case and punctuation", () => {
    expect(longestCopiedRun("WHEN A CHANNEL, is closed!", text)).toBe(
      "when a channel is closed",
    );
  });

  it("finds nothing when no word is shared", () => {
    expect(longestCopiedRun("Dice decide everything", text)).toBe("");
  });
});

describe("copiedWords", () => {
  it("passes a description in its own words", () => {
    expect(copiedWords(fresh, context).pass).toBe(true);
  });

  it("fails six copied words in a row, and names them", () => {
    const result = copiedWords(
      `${fresh} Each one may put a boat on it.`,
      context,
    );
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('"may put a boat on it"');
  });

  it("passes NONE, the answer for an article that says too little", () => {
    expect(copiedWords("NONE", context).pass).toBe(true);
  });
});

describe("wordCount", () => {
  it("passes 30 to 60 words", () => {
    expect(wordCount(fresh).pass).toBe(true);
  });

  it("fails a description too short or too long", () => {
    expect(wordCount("A short game about boats.").pass).toBe(false);
    expect(wordCount(`${fresh} ${fresh}`).pass).toBe(false);
  });

  it("passes NONE", () => {
    expect(wordCount("NONE.").pass).toBe(true);
  });
});

describe("bannedWords", () => {
  it("fails hype and the word you", () => {
    expect(bannedWords("A classic game.").reason).toBe('Uses "classic"');
    expect(bannedWords("You draw a tile.").pass).toBe(false);
  });

  it("passes a plain description", () => {
    expect(bannedWords(fresh).pass).toBe(true);
  });
});

describe("noEmDash and opensWithTitle", () => {
  it("fails an em dash", () => {
    expect(noEmDash("Boats score — eventually.").pass).toBe(false);
    expect(noEmDash(fresh).pass).toBe(true);
  });

  it("fails a description that opens with the title, in any case", () => {
    expect(opensWithTitle("harbor lights is a game.", context).pass).toBe(
      false,
    );
    expect(opensWithTitle(fresh, context).pass).toBe(true);
  });
});
